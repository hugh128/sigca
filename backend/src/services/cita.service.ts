import type { QueryFilter } from "mongoose";
import { Cita, ESTADOS_QUE_BLOQUEAN, type CitaDoc, type EstadoCita, type ICita } from "../models/Cita";
import { Horario } from "../models/Horario";
import { Paciente } from "../models/Paciente";
import { Servicio } from "../models/Servicio";
import { Usuario, type Rol } from "../models/Usuario";
import { AppError } from "../utils/AppError";
import { conBloqueo } from "../utils/bloqueo";
import {
  aInstante, calcularEdad, diaSemana, horaAMinutos, MAYORIA_DE_EDAD, minutosAHora, partesGuatemala, sumarDias, sumarMinutos,
} from "../utils/fechas";
import { armarPagina } from "../utils/paginar";

export interface Actor {
  id: string;
  rol: Rol;
}

const POPULAR = [
  { path: "paciente", select: "nombres apellidos fechaNacimiento fotoUrl" },
  { path: "servicio", select: "nombre" },
  { path: "profesional", select: "nombre" },
];

/** La recepcion y administracion ven el precio; el profesional no necesita ver dinero. */
function vista(cita: CitaDoc, actor: Actor) {
  const json = cita.toJSON() as unknown as Record<string, unknown>;
  if (actor.rol === "PROFESIONAL") delete json.precioCentavos;
  return json;
}

const NOMBRE_DIA: Record<string, string> = {
  LUNES: "lunes", MARTES: "martes", MIERCOLES: "miércoles", JUEVES: "jueves", VIERNES: "viernes", SABADO: "sábado", DOMINGO: "domingo",
};
const NOMBRE_DIA_PLURAL: Record<string, string> = { ...NOMBRE_DIA, SABADO: "sábados", DOMINGO: "domingos" };

const textoFecha = (fecha: string, hora: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)} ${hora}`;

/* ------------------------------------------------------------------------------------------------
 * Validaciones de la agenda
 * ---------------------------------------------------------------------------------------------- */

/** RN-11, RN-02 y RN-01. Debe ejecutarse dentro del bloqueo del profesional. */
async function validarAgenda(p: { profesionalId: string; inicio: Date; fin: Date; excluirCitaId?: string }) {
  // RN-11: no se programa en el pasado
  if (p.inicio.getTime() < Date.now()) throw AppError.unprocessable("No se pueden programar citas en fechas u horas pasadas");

  const { fecha, hora: horaInicio } = partesGuatemala(p.inicio);
  const { fecha: fechaFin, hora: horaFin } = partesGuatemala(p.fin);

  // RN-02: dentro del horario de atencion configurado
  const dia = diaSemana(fecha);
  const horario = await Horario.findOne({ dia });
  if (!horario?.atiende || horario.franjas.length === 0) {
    throw AppError.unprocessable(`El centro no atiende los ${NOMBRE_DIA_PLURAL[dia]}`);
  }
  const cabe = fechaFin === fecha && horario.franjas.some((f) => f.inicio <= horaInicio && horaFin <= f.fin);
  if (!cabe) {
    const franjas = horario.franjas.map((f) => `${f.inicio}–${f.fin}`).join(" y ");
    throw AppError.unprocessable(
      `La cita (${horaInicio}–${horaFin}) no cabe en el horario de atención del ${NOMBRE_DIA[dia]}: ${franjas}`,
    );
  }

  // RN-01: sin traslapes para el mismo profesional (RN-13: solo bloquean las pendientes y confirmadas).
  // Dos citas "pegadas" (una termina cuando la otra empieza) NO se traslapan.
  const choque = await Cita.findOne({
    profesional: p.profesionalId,
    estado: { $in: ESTADOS_QUE_BLOQUEAN },
    inicio: { $lt: p.fin },
    fin: { $gt: p.inicio },
    ...(p.excluirCitaId ? { _id: { $ne: p.excluirCitaId } } : {}),
  });
  if (choque) {
    const ci = partesGuatemala(choque.inicio).hora;
    const cf = partesGuatemala(choque.fin).hora;
    throw AppError.conflict(`El profesional ya tiene una cita de ${ci} a ${cf} ese día`, { conflicto: { horaInicio: ci, horaFin: cf } });
  }
}

async function profesionalValido(id: string) {
  const u = await Usuario.findById(id);
  if (!u) throw AppError.notFound("Profesional no encontrado");
  if (u.rol !== "PROFESIONAL") throw AppError.unprocessable("El usuario elegido no es un profesional");
  if (!u.activo) throw AppError.unprocessable("El profesional está inactivo");
  return u;
}

async function pacienteValido(id: string) {
  const paciente = await Paciente.findById(id);
  if (!paciente) throw AppError.notFound("Paciente no encontrado");
  if (paciente.estado !== "ACTIVO") throw AppError.unprocessable("El paciente está inactivo y no puede recibir nuevas citas");
  if (calcularEdad(paciente.fechaNacimiento) < MAYORIA_DE_EDAD && paciente.responsables.length === 0) {
    throw AppError.unprocessable("El paciente es menor de edad y todavía no tiene un responsable. Registra uno antes de programar citas");
  }
  return paciente;
}

function validarEditable(cita: CitaDoc) {
  if (cita.estado === "COMPLETADA") throw AppError.unprocessable("Una cita completada no puede reprogramarse ni modificarse");
  if (cita.estado === "CANCELADA") throw AppError.unprocessable("Una cita cancelada no puede modificarse. Programa una nueva cita");
}

/* ------------------------------------------------------------------------------------------------
 * Consultas
 * ---------------------------------------------------------------------------------------------- */
export interface FiltrosCitas {
  desde?: string;
  hasta?: string;
  estado?: EstadoCita[];
  profesionalId?: string;
  pacienteId?: string;
  servicioId?: string;
  orden: "asc" | "desc";
  page: number;
  limit: number;
}

export async function listar(f: FiltrosCitas, actor: Actor) {
  const filtro: QueryFilter<ICita> = {};
  if (f.estado) filtro.estado = { $in: f.estado };
  if (f.pacienteId) filtro.paciente = f.pacienteId;
  if (f.servicioId) filtro.servicio = f.servicioId;
  // El profesional solo ve SUS citas, aunque pida otro profesional
  if (actor.rol === "PROFESIONAL") filtro.profesional = actor.id;
  else if (f.profesionalId) filtro.profesional = f.profesionalId;

  // Rango de dias completos en hora de Guatemala
  if (f.desde || f.hasta) {
    filtro.inicio = {
      ...(f.desde ? { $gte: aInstante(f.desde, "00:00") } : {}),
      ...(f.hasta ? { $lt: aInstante(sumarDias(f.hasta, 1), "00:00") } : {}),
    };
  }

  const sentido = f.orden === "asc" ? 1 : -1;
  const [docs, total] = await Promise.all([
    Cita.find(filtro).sort({ inicio: sentido }).skip((f.page - 1) * f.limit).limit(f.limit).populate(POPULAR),
    Cita.countDocuments(filtro),
  ]);
  return armarPagina(docs.map((d) => vista(d, actor)), total, f.page, f.limit);
}

export async function obtener(id: string, actor: Actor) {
  const cita = await Cita.findById(id).populate(POPULAR).populate({ path: "historial.usuario", select: "nombre" });
  // Un profesional no puede ni saber que existen las citas de otros: se responde como si no existieran.
  if (!cita || (actor.rol === "PROFESIONAL" && String(cita.profesional && (cita.profesional as unknown as { id: string }).id) !== actor.id)) {
    throw AppError.notFound("Cita no encontrada");
  }
  return vista(cita, actor);
}

/** Cuantas citas pendientes o confirmadas, de hoy en adelante, tiene un paciente o profesional. */
export function contarCitasFuturas(filtro: { paciente?: string; profesional?: string }) {
  return Cita.countDocuments({ ...filtro, estado: { $in: ESTADOS_QUE_BLOQUEAN }, inicio: { $gte: new Date() } });
}

/** Horarios disponibles de un profesional para un servicio en una fecha (cada 15 minutos y pegados a las citas existentes). */
export async function disponibilidad(p: { profesionalId: string; servicioId: string; fecha: string; excluirCitaId?: string }) {
  const cita = p.excluirCitaId ? await Cita.findById(p.excluirCitaId) : null;
  if (p.excluirCitaId && !cita) throw AppError.notFound("Cita no encontrada");
  if (cita) {
    validarEditable(cita);
    if (String(cita.servicio) !== p.servicioId) throw AppError.unprocessable("El servicio debe coincidir con el de la cita que se reprograma");
    await pacienteValido(String(cita.paciente));
  }
  const servicio = await Servicio.findById(p.servicioId);
  if (!servicio) throw AppError.notFound("Servicio no encontrado");
  if (!cita && servicio.estado !== "ACTIVO") throw AppError.unprocessable("El servicio está inactivo");
  await profesionalValido(p.profesionalId);

  const duracionMin = cita?.duracionMin ?? servicio.duracionMin;
  const base = { fecha: p.fecha, duracionMin };
  const horario = await Horario.findOne({ dia: diaSemana(p.fecha) });
  if (!horario?.atiende) return { ...base, horarios: [] };

  const inicioDia = aInstante(p.fecha, "00:00");
  const finDia = aInstante(sumarDias(p.fecha, 1), "00:00");
  const ocupadas = await Cita.find({
    profesional: p.profesionalId,
    estado: { $in: ESTADOS_QUE_BLOQUEAN },
    inicio: { $lt: finDia },
    fin: { $gt: inicioDia },
    ...(p.excluirCitaId ? { _id: { $ne: p.excluirCitaId } } : {}),
  });

  // Horas de inicio candidatas: una cuadricula de 15 minutos, MAS el instante exacto en que termina cada cita
  // ya agendada (asi se ofrece "pegar" una cita a la anterior sin dejar huecos de unos pocos minutos).
  const finesDeOcupadas = ocupadas
    .map((c) => partesGuatemala(c.fin))
    .filter((f) => f.fecha === p.fecha)
    .map((f) => horaAMinutos(f.hora));

  const ahora = Date.now();
  const horarios: { horaInicio: string; horaFin: string }[] = [];
  for (const franja of horario.franjas) {
    const desde = horaAMinutos(franja.inicio);
    const ultimo = horaAMinutos(franja.fin) - duracionMin;
    const candidatos = new Set<number>(finesDeOcupadas.filter((m) => m >= desde && m <= ultimo));
    for (let t = desde; t <= ultimo; t += 15) candidatos.add(t);

    for (const t of [...candidatos].sort((a, b) => a - b)) {
      const inicio = aInstante(p.fecha, minutosAHora(t));
      const fin = sumarMinutos(inicio, duracionMin);
      if (inicio.getTime() < ahora) continue;
      if (ocupadas.some((c) => c.inicio < fin && c.fin > inicio)) continue;
      horarios.push({ horaInicio: minutosAHora(t), horaFin: minutosAHora(t + duracionMin) });
    }
  }
  return { ...base, horarios };
}

/* ------------------------------------------------------------------------------------------------
 * Programar
 * ---------------------------------------------------------------------------------------------- */
export interface DatosCita {
  pacienteId: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  horaInicio: string;
  observaciones?: string;
}

export async function crear(d: DatosCita, actor: Actor) {
  const [paciente, servicio] = await Promise.all([pacienteValido(d.pacienteId), Servicio.findById(d.servicioId)]);
  if (!servicio) throw AppError.notFound("Servicio no encontrado");

  // RN-07 y RN-03: servicio activo
  if (servicio.estado !== "ACTIVO") throw AppError.unprocessable("El servicio está inactivo y no puede seleccionarse para nuevas citas");
  // RN-03: profesional activo
  await profesionalValido(d.profesionalId);

  const inicio = aInstante(d.fecha, d.horaInicio);
  const fin = sumarMinutos(inicio, servicio.duracionMin); // RN-12: la duracion sale del servicio

  const id = await conBloqueo(`profesional:${d.profesionalId}`, async () => {
    await validarAgenda({ profesionalId: d.profesionalId, inicio, fin });
    const cita = await Cita.create({
      paciente: paciente.id,
      servicio: servicio.id,
      profesional: d.profesionalId,
      inicio,
      fin,
      duracionMin: servicio.duracionMin, // se COPIAN: si el servicio cambia despues, esta cita conserva los suyos
      precioCentavos: servicio.precioCentavos,
      estado: "PENDIENTE",
      observaciones: d.observaciones || undefined,
      creadoPor: actor.id,
      historial: [{ estado: "PENDIENTE", fecha: new Date(), usuario: actor.id, nota: "Cita programada" }],
    });
    return cita.id as string;
  });
  return obtener(id, actor);
}

/* ------------------------------------------------------------------------------------------------
 * Reprogramar / editar
 * ---------------------------------------------------------------------------------------------- */
export async function actualizar(
  id: string,
  cambios: { fecha?: string; horaInicio?: string; profesionalId?: string; observaciones?: string },
  actor: Actor,
) {
  const cita = await Cita.findById(id);
  if (!cita) throw AppError.notFound("Cita no encontrada");
  // RN-06: una cita completada no se reprograma (y una cancelada tampoco: se programa otra)
  validarEditable(cita);

  const actual = partesGuatemala(cita.inicio);
  const fecha = cambios.fecha ?? actual.fecha;
  const horaInicio = cambios.horaInicio ?? actual.hora;
  const profesionalId = cambios.profesionalId ?? String(cita.profesional);
  const cambiaAgenda = fecha !== actual.fecha || horaInicio !== actual.hora || profesionalId !== String(cita.profesional);

  if (cambiaAgenda) {
    await Promise.all([pacienteValido(String(cita.paciente)), profesionalValido(profesionalId)]);
    const inicio = aInstante(fecha, horaInicio);
    const fin = sumarMinutos(inicio, cita.duracionMin);

    await conBloqueo(`profesional:${profesionalId}`, async () => {
      await validarAgenda({ profesionalId, inicio, fin, excluirCitaId: id });
      const antes = `${textoFecha(actual.fecha, actual.hora)}`;
      cita.inicio = inicio;
      cita.fin = fin;
      cita.profesional = profesionalId as unknown as typeof cita.profesional;
      if (cambios.observaciones !== undefined) cita.observaciones = cambios.observaciones || undefined;
      cita.historial.push({
        estado: cita.estado, fecha: new Date(), usuario: actor.id as unknown as ICita["creadoPor"],
        nota: `Reprogramada: ${antes} → ${textoFecha(fecha, horaInicio)}`,
      });
      await cita.save();
    });
  } else if (cambios.observaciones !== undefined) {
    cita.observaciones = cambios.observaciones || undefined;
    await cita.save();
  }
  return obtener(id, actor);
}

/* ------------------------------------------------------------------------------------------------
 * Cambios de estado
 * ---------------------------------------------------------------------------------------------- */
/** PENDIENTE -> CONFIRMADA -> COMPLETADA; se puede cancelar desde PENDIENTE o CONFIRMADA. CANCELADA y COMPLETADA son finales. */
const TRANSICIONES: Record<EstadoCita, EstadoCita[]> = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

/** Que estados puede asignar cada rol (RF-02). */
const PUEDE_ASIGNAR: Record<Rol, EstadoCita[]> = {
  ADMINISTRADOR: ["CONFIRMADA", "COMPLETADA", "CANCELADA"],
  RECEPCIONISTA: ["CONFIRMADA", "CANCELADA"],
  PROFESIONAL: ["COMPLETADA"],
};

export async function cambiarEstado(id: string, estado: EstadoCita, motivo: string | undefined, actor: Actor) {
  const cita = await Cita.findById(id);
  if (!cita || (actor.rol === "PROFESIONAL" && String(cita.profesional) !== actor.id)) throw AppError.notFound("Cita no encontrada");

  if (!PUEDE_ASIGNAR[actor.rol].includes(estado)) {
    throw AppError.forbidden(`Tu rol no puede marcar una cita como ${estado.toLowerCase()}`);
  }

  const desde = cita.estado;
  if (desde === estado) throw AppError.unprocessable(`La cita ya está ${estado.toLowerCase()}`);
  if (desde === "CANCELADA") {
    throw AppError.unprocessable(
      estado === "COMPLETADA"
        ? "Una cita cancelada no puede pasar a completada. Programa una nueva cita"
        : "Una cita cancelada no puede volver a activarse. Programa una nueva cita",
    );
  }
  if (desde === "COMPLETADA") throw AppError.unprocessable("Una cita completada no puede cambiar de estado");
  if (desde === "PENDIENTE" && estado === "COMPLETADA") throw AppError.unprocessable("Confirma la cita antes de marcarla como completada");
  if (!TRANSICIONES[desde].includes(estado)) throw AppError.unprocessable(`No se puede pasar de ${desde.toLowerCase()} a ${estado.toLowerCase()}`);

  if (estado === "CONFIRMADA" && cita.inicio.getTime() < Date.now()) {
    throw AppError.unprocessable("No se puede confirmar una cita cuya hora ya pasó. Cancélala o reprográmala");
  }

  cita.estado = estado;
  if (estado === "CANCELADA" && motivo) cita.motivoCancelacion = motivo;
  cita.historial.push({
    estado, fecha: new Date(), usuario: actor.id as unknown as ICita["creadoPor"],
    nota: estado === "CANCELADA" && motivo ? `Cancelada: ${motivo}` : undefined,
  });
  await cita.save();
  return obtener(id, actor);
}
