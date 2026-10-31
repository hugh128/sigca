import type { QueryFilter } from "mongoose";
import { Cita } from "../models/Cita";
import { Paciente, type EstadoPaciente, type IPaciente, type PacienteDoc } from "../models/Paciente";
import { Responsable } from "../models/Responsable";
import { AppError } from "../utils/AppError";
import type { Rol } from "../models/Usuario";
import { calcularEdad, fechaLimiteMayoriaEdad, hoyGuatemala, MAYORIA_DE_EDAD } from "../utils/fechas";
import { armarPagina } from "../utils/paginar";
import { escaparRegex, normalizar } from "../utils/texto";
import { contarCitasFuturas } from "./cita.service";

export interface ActorPaciente {
  id: string;
  rol: Rol;
}

/** El profesional solo ve informacion basica de pacientes que atiende (o atendio): sin telefono, direccion ni responsables. */
function vistaBasica(p: PacienteDoc) {
  const j = p.toJSON() as unknown as Record<string, unknown>;
  return Object.fromEntries(["id", "nombres", "apellidos", "sexo", "fotoUrl", "estado", "edad", "esMenor"].map((k) => [k, j[k]]));
}

const esProfesional = (a?: ActorPaciente) => a?.rol === "PROFESIONAL";

export interface FiltrosPacientes {
  q?: string;
  estado?: EstadoPaciente;
  menores?: boolean;
  page: number;
  limit: number;
}

async function conResponsables(id: string): Promise<PacienteDoc> {
  const paciente = await Paciente.findById(id).populate("responsables");
  if (!paciente) throw AppError.notFound("Paciente no encontrado");
  return paciente;
}

export async function listar({ q, estado, menores, page, limit }: FiltrosPacientes, actor?: ActorPaciente) {
  const filtro: QueryFilter<IPaciente> = {};
  if (esProfesional(actor)) filtro._id = { $in: await Cita.distinct("paciente", { profesional: actor!.id }) };
  if (estado) filtro.estado = estado;

  if (menores !== undefined) {
    const limite = fechaLimiteMayoriaEdad(hoyGuatemala());
    // menor de 18 = nacio DESPUES de la fecha limite
    filtro.fechaNacimiento = menores ? { $gt: limite } : { $lte: limite };
  }

  // Busqueda sin importar tildes ni mayusculas; cada palabra escrita debe aparecer (nombre, apellido o telefono).
  const palabras = q ? normalizar(q).split(" ").filter(Boolean) : [];
  if (palabras.length > 0) filtro.$and = palabras.map((p) => ({ busqueda: { $regex: escaparRegex(p) } }));

  const [items, total] = await Promise.all([
    Paciente.find(filtro).sort({ orden: 1 }).skip((page - 1) * limit).limit(limit).populate("responsables"),
    Paciente.countDocuments(filtro),
  ]);
  return armarPagina<unknown>(esProfesional(actor) ? items.map(vistaBasica) : items, total, page, limit);
}

export async function obtener(id: string, actor?: ActorPaciente) {
  if (esProfesional(actor)) {
    // Solo si tiene (o tuvo) citas con este profesional; si no, se responde como si no existiera
    const paciente = (await Cita.exists({ paciente: id, profesional: actor!.id })) ? await Paciente.findById(id) : null;
    if (!paciente) throw AppError.notFound("Paciente no encontrado");
    return vistaBasica(paciente);
  }
  return conResponsables(id);
}

async function validarResponsablesExisten(ids: string[]) {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return unicos;
  const existentes = await Responsable.countDocuments({ _id: { $in: unicos } });
  if (existentes !== unicos.length) throw AppError.unprocessable("Alguno de los responsables indicados no existe");
  return unicos;
}

export async function crear(datos: Partial<IPaciente> & { responsables: string[] }) {
  const responsables = await validarResponsablesExisten(datos.responsables);
  const paciente = await Paciente.create({ ...datos, responsables, fechaInicio: datos.fechaInicio ?? hoyGuatemala() });
  return conResponsables(paciente.id);
}

export async function actualizar(id: string, cambios: Partial<IPaciente>) {
  const paciente = await Paciente.findById(id);
  if (!paciente) throw AppError.notFound("Paciente no encontrado");
  paciente.set(cambios);
  await paciente.save(); // vuelve a calcular los campos de busqueda y orden
  return conResponsables(id);
}

/** Eliminacion logica: el paciente y su historial se conservan. */
export async function cambiarEstado(id: string, estado: EstadoPaciente) {
  const paciente = await Paciente.findById(id);
  if (!paciente) throw AppError.notFound("Paciente no encontrado");
  if (estado === "INACTIVO") {
    const futuras = await contarCitasFuturas({ paciente: id });
    if (futuras > 0) {
      throw AppError.unprocessable(
        `No se puede desactivar: el paciente tiene ${futuras} cita${futuras === 1 ? "" : "s"} pendiente${futuras === 1 ? "" : "s"} o confirmada${futuras === 1 ? "" : "s"}. Cancélalas o reprográmalas primero`,
      );
    }
  }
  paciente.estado = estado;
  await paciente.save();
  return conResponsables(id);
}

export async function asociarResponsable(pacienteId: string, responsableId: string) {
  if (!(await Responsable.exists({ _id: responsableId }))) throw AppError.notFound("Responsable no encontrado");
  const r = await Paciente.updateOne({ _id: pacienteId }, { $addToSet: { responsables: responsableId } });
  if (r.matchedCount === 0) throw AppError.notFound("Paciente no encontrado");
  return conResponsables(pacienteId);
}

export async function desasociarResponsable(pacienteId: string, responsableId: string) {
  await validarQuedaConResponsable(pacienteId, responsableId);
  const r = await Paciente.updateOne({ _id: pacienteId }, { $pull: { responsables: responsableId } });
  if (r.matchedCount === 0) throw AppError.notFound("Paciente no encontrado");
  return conResponsables(pacienteId);
}

/**
 * RN-04: un menor con citas pendientes o confirmadas no puede quedarse sin ningun responsable.
 * (Lo comparten las dos formas de quitar la asociacion: desde el paciente y desde el responsable.)
 */
export async function validarQuedaConResponsable(pacienteId: string, responsableId: string) {
  const paciente = await Paciente.findById(pacienteId);
  if (!paciente) throw AppError.notFound("Paciente no encontrado");
  const eraElUnico = paciente.responsables.length === 1 && String(paciente.responsables[0]) === responsableId;
  if (!eraElUnico || calcularEdad(paciente.fechaNacimiento) >= MAYORIA_DE_EDAD) return;
  const futuras = await contarCitasFuturas({ paciente: pacienteId });
  if (futuras > 0) {
    throw AppError.unprocessable(
      `No se puede quitar: es el único responsable de un menor de edad con ${futuras} cita${futuras === 1 ? "" : "s"} pendiente${futuras === 1 ? "" : "s"} o confirmada${futuras === 1 ? "" : "s"}. Registra otro responsable antes o cancela las citas`,
    );
  }
}
