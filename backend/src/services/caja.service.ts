import { mongo, type QueryFilter } from "mongoose";
import { Caja, type ICaja } from "../models/Caja";
import { AppError } from "../utils/AppError";
import { armarPagina } from "../utils/paginar";
import type { Rol } from "../models/Usuario";
export interface ActorCaja { id: string; rol: Rol }
const RESPONSABLE = { path: "usuario", select: "nombre" };
export async function abrir(montoInicialCentavos: number, actor: ActorCaja) {
  // Esperar el indice antes de aceptar aperturas, incluso en una base recien creada.
  await Caja.init();
  try {
    const caja = await Caja.create({ usuario: actor.id, montoInicialCentavos });
    return caja.populate(RESPONSABLE);
  } catch (e) {
    if (e instanceof mongo.MongoServerError && e.code === 11000) throw AppError.conflict("Ya tienes una caja abierta. Consulta tu caja actual.");
    throw e;
  }
}
export function actual(actor: ActorCaja) {
  return Caja.findOne({ usuario: actor.id, estado: "ABIERTA" }).populate(RESPONSABLE);
}
export async function listar(f: { page: number; limit: number; estado?: ICaja["estado"]; usuarioId?: string }, actor: ActorCaja) {
  if (actor.rol !== "ADMINISTRADOR" && f.usuarioId && f.usuarioId !== actor.id) throw AppError.forbidden("Solo puedes consultar tus propias cajas");
  const filtro: QueryFilter<ICaja> = {};
  if (actor.rol !== "ADMINISTRADOR") filtro.usuario = actor.id;
  else if (f.usuarioId) filtro.usuario = f.usuarioId;
  if (f.estado) filtro.estado = f.estado;
  const [items, total] = await Promise.all([
    Caja.find(filtro).sort({ apertura: -1, _id: -1 }).skip((f.page - 1) * f.limit).limit(f.limit).populate(RESPONSABLE),
    Caja.countDocuments(filtro),
  ]);
  return armarPagina(items, total, f.page, f.limit);
}
export async function obtener(id: string, actor: ActorCaja) {
  const filtro: QueryFilter<ICaja> = { _id: id };
  if (actor.rol !== "ADMINISTRADOR") filtro.usuario = actor.id;
  const caja = await Caja.findOne(filtro).populate(RESPONSABLE);
  if (!caja) throw AppError.notFound("Caja no encontrada");
  return caja;
}
