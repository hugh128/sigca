import mongoose, { type ClientSession } from "mongoose";
import { Servicio } from "../models/Servicio";
import { SolicitudCita, type EstadoSolicitud } from "../models/SolicitudCita";
import type { crearSolicitudBody } from "../schemas/solicitud.schema";
import type { z } from "zod";
import { AppError } from "../utils/AppError";
import { armarPagina } from "../utils/paginar";
import { crearEnTransaccion, type Actor, type DatosCita } from "./cita.service";

const POPULAR = [
  { path: "servicio", select: "nombre estado duracionMin" },
  { path: "cita", select: "inicio fin estado duracionMin" },
  { path: "gestionadoPor", select: "nombre" },
];
export async function crear(d: z.infer<typeof crearSolicitudBody>) {
  const servicio = await Servicio.findById(d.servicioId);
  if (!servicio) throw AppError.notFound("Servicio no encontrado");
  if (servicio.estado !== "ACTIVO") throw AppError.unprocessable("El servicio está inactivo");
  const { servicioId, ...datos } = d;
  await SolicitudCita.create({ ...datos, servicio: servicioId });
}
export async function listar({ page, limit, estado }: { page: number; limit: number; estado?: EstadoSolicitud }) {
  const filtro = estado ? { estado } : {};
  const [items, total] = await Promise.all([
    SolicitudCita.find(filtro).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULAR),
    SolicitudCita.countDocuments(filtro),
  ]);
  return armarPagina(items, total, page, limit);
}
export async function obtener(id: string) {
  const solicitud = await SolicitudCita.findById(id).populate(POPULAR);
  if (!solicitud) throw AppError.notFound("Solicitud no encontrada");
  return solicitud;
}
async function falloGestion(id: string, session: ClientSession | null = null): Promise<never> {
  if (!(await SolicitudCita.exists({ _id: id }).session(session))) throw AppError.notFound("Solicitud no encontrada");
  throw AppError.conflict("Esta solicitud ya fue atendida o rechazada. Actualiza la lista para ver su estado.");
}
export async function convertir(id: string, d: Omit<DatosCita, "servicioId">, actor: Actor) {
  await mongoose.connection.transaction(async session => {
    const solicitud = await SolicitudCita.findOneAndUpdate(
      { _id: id, estado: "PENDIENTE" },
      { $set: { estado: "ATENDIDA", gestionadoPor: actor.id, fechaGestion: new Date() } },
      { returnDocument: "after", session },
    );
    if (!solicitud) return falloGestion(id, session);
    const citaId = await crearEnTransaccion({ ...d, servicioId: String(solicitud.servicio) }, actor, session);
    solicitud.cita = citaId as unknown as typeof solicitud.cita;
    await solicitud.save({ session });
  });
  return obtener(id);
}
export async function rechazar(id: string, motivo: string | undefined, actor: Actor) {
  const solicitud = await SolicitudCita.findOneAndUpdate(
    { _id: id, estado: "PENDIENTE" },
    { $set: { estado: "RECHAZADA", motivoRechazo: motivo || undefined, gestionadoPor: actor.id, fechaGestion: new Date() } },
    { returnDocument: "after", runValidators: true },
  );
  if (!solicitud) return falloGestion(id);
  return obtener(id);
}
