import { mongo, type QueryFilter } from "mongoose";
import { Material, type IMaterial } from "../models/Material";
import { AsignacionMaterial } from "../models/AsignacionMaterial";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { AppError } from "../utils/AppError";
import { armarPagina } from "../utils/paginar";
import { escaparRegex } from "../utils/texto";
import type { ActorPaciente } from "./paciente.service";
type Datos = Pick<IMaterial, "titulo" | "descripcion" | "tipo" | "enlace">;
export async function listar(f: { page: number; limit: number; q?: string; estado?: IMaterial["estado"] }, actor: ActorPaciente) {
  const filtro: QueryFilter<IMaterial> = {};
  if (actor.rol === "PROFESIONAL") filtro.estado = "ACTIVO";
  else if (f.estado) filtro.estado = f.estado;
  if (f.q) filtro.titulo = { $regex: escaparRegex(f.q), $options: "i" };
  const [items, total] = await Promise.all([
    Material.find(filtro).sort({ titulo: 1, _id: 1 }).skip((f.page - 1) * f.limit).limit(f.limit), Material.countDocuments(filtro),
  ]);
  return armarPagina(items, total, f.page, f.limit);
}
export async function obtener(id: string, actor: ActorPaciente) {
  const m = await Material.findById(id);
  if (!m || (actor.rol === "PROFESIONAL" && m.estado !== "ACTIVO")) throw AppError.notFound("Material no encontrado");
  return m;
}
export const crear = (d: Datos) => Material.create(d);
export async function actualizar(id: string, d: Partial<Datos> | { estado: IMaterial["estado"] }) {
  const m = await Material.findById(id);
  if (!m) throw AppError.notFound("Material no encontrado");
  m.set(d); await m.save(); return m;
}
async function pacientePermitido(id: string, actor: ActorPaciente) {
  if (actor.rol === "PROFESIONAL" && !(await Cita.exists({ paciente: id, profesional: actor.id }))) throw AppError.notFound("Paciente no encontrado");
  const p = await Paciente.findById(id);
  if (!p) throw AppError.notFound("Paciente no encontrado");
  return p;
}
const POPULAR = [{ path: "material" }, { path: "asignadoPor", select: "nombre" }];
export async function asignaciones(id: string, f: { page: number; limit: number }, actor: ActorPaciente) {
  await pacientePermitido(id, actor);
  const [items, total] = await Promise.all([
    AsignacionMaterial.find({ paciente: id }).sort({ createdAt: -1, _id: -1 }).skip((f.page - 1) * f.limit).limit(f.limit).populate(POPULAR),
    AsignacionMaterial.countDocuments({ paciente: id }),
  ]);
  return armarPagina(items, total, f.page, f.limit);
}
export async function asignar(pacienteId: string, materialId: string, actor: ActorPaciente) {
  const p = await pacientePermitido(pacienteId, actor);
  if (p.estado !== "ACTIVO") throw AppError.unprocessable("Solo se asignan materiales a pacientes activos");
  const m = await Material.findById(materialId);
  if (!m) throw AppError.notFound("Material no encontrado");
  if (m.estado !== "ACTIVO") throw AppError.unprocessable("El material está inactivo");
  // El índice único también protege peticiones simultáneas: una asignación por paciente/material.
  try {
    const a = await AsignacionMaterial.create({ paciente: pacienteId, material: materialId, asignadoPor: actor.id });
    return a.populate(POPULAR);
  } catch (e) {
    if (e instanceof mongo.MongoServerError && e.code === 11000) throw AppError.conflict("Este material ya está asignado al paciente");
    throw e;
  }
}
