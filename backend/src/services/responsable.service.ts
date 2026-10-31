import type { QueryFilter } from "mongoose";
import { Paciente } from "../models/Paciente";
import { Responsable, type IResponsable } from "../models/Responsable";
import { AppError } from "../utils/AppError";
import { armarPagina } from "../utils/paginar";
import { escaparRegex, normalizar } from "../utils/texto";
import { validarQuedaConResponsable } from "./paciente.service";

type PacienteResumen = { id: string; nombres: string; apellidos: string; estado: string };

/** Pacientes asociados a cada responsable (una sola consulta para toda la lista). */
async function pacientesDe(ids: string[]): Promise<Map<string, PacienteResumen[]>> {
  const mapa = new Map<string, PacienteResumen[]>(ids.map((id) => [id, []]));
  if (ids.length === 0) return mapa;
  const pacientes = await Paciente.find({ responsables: { $in: ids } }).sort({ orden: 1 }).select("nombres apellidos estado responsables");
  for (const p of pacientes) {
    for (const rid of p.responsables) mapa.get(String(rid))?.push({ id: p.id, nombres: p.nombres, apellidos: p.apellidos, estado: p.estado });
  }
  return mapa;
}

function conPacientes(doc: { toJSON(): unknown; id: string }, mapa: Map<string, PacienteResumen[]>) {
  return { ...(doc.toJSON() as object), pacientes: mapa.get(doc.id) ?? [] };
}

export async function listar({ q, page, limit }: { q?: string; page: number; limit: number }) {
  const filtro: QueryFilter<IResponsable> = {};
  const palabras = q ? normalizar(q).split(" ").filter(Boolean) : [];
  if (palabras.length > 0) filtro.$and = palabras.map((p) => ({ busqueda: { $regex: escaparRegex(p) } }));

  const [docs, total] = await Promise.all([
    Responsable.find(filtro).sort({ orden: 1 }).skip((page - 1) * limit).limit(limit),
    Responsable.countDocuments(filtro),
  ]);
  const mapa = await pacientesDe(docs.map((d) => d.id));
  return armarPagina(docs.map((d) => conPacientes(d, mapa)), total, page, limit);
}

export async function obtener(id: string) {
  const doc = await Responsable.findById(id);
  if (!doc) throw AppError.notFound("Responsable no encontrado");
  return conPacientes(doc, await pacientesDe([doc.id]));
}

export async function crear(datos: Partial<IResponsable> & { pacientes: string[] }) {
  const { pacientes, ...campos } = datos;
  const unicos = [...new Set(pacientes)];
  if (unicos.length > 0 && (await Paciente.countDocuments({ _id: { $in: unicos } })) !== unicos.length) {
    throw AppError.unprocessable("Alguno de los pacientes indicados no existe");
  }
  const doc = await Responsable.create(campos);
  if (unicos.length > 0) await Paciente.updateMany({ _id: { $in: unicos } }, { $addToSet: { responsables: doc.id } });
  return obtener(doc.id);
}

export async function actualizar(id: string, cambios: Partial<IResponsable>) {
  const doc = await Responsable.findById(id);
  if (!doc) throw AppError.notFound("Responsable no encontrado");
  doc.set(cambios);
  await doc.save();
  return obtener(id);
}

export async function asociarPaciente(responsableId: string, pacienteId: string) {
  if (!(await Responsable.exists({ _id: responsableId }))) throw AppError.notFound("Responsable no encontrado");
  const r = await Paciente.updateOne({ _id: pacienteId }, { $addToSet: { responsables: responsableId } });
  if (r.matchedCount === 0) throw AppError.notFound("Paciente no encontrado");
  return obtener(responsableId);
}

export async function desasociarPaciente(responsableId: string, pacienteId: string) {
  if (!(await Responsable.exists({ _id: responsableId }))) throw AppError.notFound("Responsable no encontrado");
  await validarQuedaConResponsable(pacienteId, responsableId);
  const r = await Paciente.updateOne({ _id: pacienteId }, { $pull: { responsables: responsableId } });
  if (r.matchedCount === 0) throw AppError.notFound("Paciente no encontrado");
  return obtener(responsableId);
}
