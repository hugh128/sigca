import mongoose, { mongo, type ClientSession, type QueryFilter } from "mongoose";
import { Caja, type ICaja, type TotalesCaja } from "../models/Caja";
import { Pago } from "../models/Pago";
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
export async function actual(actor: ActorCaja) {
  return detalleEnSesion(undefined, actor);
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
export async function calcularTotales(id: string, inicial: number, session: ClientSession) {
  const grupos = await Pago.aggregate<{ _id: string; total: number }>([
    { $match: { caja: new mongoose.Types.ObjectId(id), estado: "REGISTRADO" } },
    { $group: { _id: "$metodo", total: { $sum: "$montoCentavos" } } },
  ]).session(session);
  const t: TotalesCaja = { totalEfectivoCentavos: 0, totalTransferenciaCentavos: 0, totalTarjetaCentavos: 0, totalIngresosCentavos: 0, efectivoEsperadoCentavos: 0 };
  for (const g of grupos) {
    if (g._id === "EFECTIVO") t.totalEfectivoCentavos = g.total;
    else if (g._id === "TRANSFERENCIA") t.totalTransferenciaCentavos = g.total;
    else if (g._id === "TARJETA") t.totalTarjetaCentavos = g.total;
    else throw AppError.conflict("La caja contiene un método de pago no reconocido");
  }
  t.totalIngresosCentavos = t.totalEfectivoCentavos + t.totalTransferenciaCentavos + t.totalTarjetaCentavos;
  t.efectivoEsperadoCentavos = inicial + t.totalEfectivoCentavos;
  if (!Object.values(t).every(v => Number.isSafeInteger(v) && v >= 0)) throw AppError.unprocessable("Los totales de la caja exceden el rango monetario seguro");
  return t;
}
function filtroPermitido(id: string, actor: ActorCaja) {
  const filtro: QueryFilter<ICaja> = { _id: id };
  if (actor.rol !== "ADMINISTRADOR") filtro.usuario = actor.id;
  return filtro;
}
async function detalleEnSesion(id: string | undefined, actor: ActorCaja) {
  return mongoose.connection.transaction(async session => {
    const caja = await Caja.findOne(id ? filtroPermitido(id, actor) : { usuario: actor.id, estado: "ABIERTA" }).session(session).populate([{ ...RESPONSABLE, ordered: true }, { path: "cerradoPor", select: "nombre", ordered: true }]);
    if (!caja) { if (!id) return null; throw AppError.notFound("Caja no encontrada"); }
    if (caja.estado === "CERRADA" && !caja.totalesCierre) throw AppError.conflict("La caja cerrada no tiene un cierre registrado");
    const resumen = caja.estado === "CERRADA" ? caja.totalesCierre : await calcularTotales(caja.id, caja.montoInicialCentavos, session);
    return { ...caja.toJSON(), resumen, puedeCerrar: caja.estado === "ABIERTA" };
  });
}
export function obtener(id: string, actor: ActorCaja) { return detalleEnSesion(id, actor); }
export async function movimientos(id: string, f: { page: number; limit: number }, actor: ActorCaja) {
  if (!(await Caja.exists(filtroPermitido(id, actor)))) throw AppError.notFound("Caja no encontrada");
  const filtro = { caja: id };
  const [items, total] = await Promise.all([
    Pago.find(filtro).sort({ fecha: -1, _id: -1 }).skip((f.page - 1) * f.limit).limit(f.limit).populate([{ path: "paciente", select: "nombres apellidos" }, { path: "cita", select: "inicio fin estado precioCentavos duracionMin" }, { path: "registradoPor", select: "nombre" }, { path: "anuladoPor", select: "nombre" }]),
    Pago.countDocuments(filtro),
  ]);
  return armarPagina(items, total, f.page, f.limit);
}
export async function cerrar(id: string, contado: number, actor: ActorCaja) {
  await mongoose.connection.transaction(async session => {
    const caja = await Caja.findOne(filtroPermitido(id, actor)).session(session);
    if (!caja) throw AppError.notFound("Caja no encontrada");
    if (caja.estado !== "ABIERTA") throw AppError.conflict("Esta caja ya fue cerrada");
    // Compite por el mismo documento que cobros y anulaciones, antes de calcular el snapshot.
    await Caja.updateOne({ _id: id }, { $inc: { revisionMovimientos: 1 } }, { session });
    const totales = await calcularTotales(id, caja.montoInicialCentavos, session);
    caja.estado = "CERRADA"; caja.totalesCierre = totales; caja.efectivoContadoCentavos = contado;
    caja.diferenciaCentavos = contado - totales.efectivoEsperadoCentavos;
    caja.cierre = new Date(); caja.cerradoPor = new mongoose.Types.ObjectId(actor.id);
    await caja.save({ session });
  });
  return obtener(id, actor);
}
