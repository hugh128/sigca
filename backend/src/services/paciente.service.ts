import type { QueryFilter } from "mongoose";
import { Paciente, type EstadoPaciente, type IPaciente, type PacienteDoc } from "../models/Paciente";
import { Responsable } from "../models/Responsable";
import { AppError } from "../utils/AppError";
import { fechaLimiteMayoriaEdad, hoyGuatemala } from "../utils/fechas";
import { armarPagina } from "../utils/paginar";
import { escaparRegex, normalizar } from "../utils/texto";

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

export async function listar({ q, estado, menores, page, limit }: FiltrosPacientes) {
  const filtro: QueryFilter<IPaciente> = {};
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
  return armarPagina(items, total, page, limit);
}

export const obtener = conResponsables;

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
  const r = await Paciente.updateOne({ _id: pacienteId }, { $pull: { responsables: responsableId } });
  if (r.matchedCount === 0) throw AppError.notFound("Paciente no encontrado");
  return conResponsables(pacienteId);
}
