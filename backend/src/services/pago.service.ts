import mongoose, { mongo, type ClientSession, type QueryFilter } from "mongoose";
import { Pago, type IPago } from "../models/Pago";
import { Contador } from "../models/Contador";
import { Cita } from "../models/Cita";
import { Caja } from "../models/Caja";
import { AppError } from "../utils/AppError";
import { armarPagina } from "../utils/paginar";
import { aInstante, hoyGuatemala, sumarDias } from "../utils/fechas";
import type { ActorCaja } from "./caja.service";
export async function totalPagado(citaId: string, session: ClientSession | null = null) {
  const totales = await Pago.aggregate<{ total: number }>([
    { $match: { cita: new mongoose.Types.ObjectId(citaId), estado: "REGISTRADO" } },
    { $group: { _id: null, total: { $sum: "$montoCentavos" } } },
  ]).session(session);
  return totales[0]?.total ?? 0;
}
const POPULAR = [{ path: "paciente", select: "nombres apellidos" }, { path: "cita", select: "inicio fin estado precioCentavos duracionMin" }, { path: "registradoPor", select: "nombre" }];
export async function crear(d: { citaId: string; montoCentavos: number; metodo: IPago["metodo"] }, actor: ActorCaja) {
  await Promise.all([Pago.init(), Contador.init()]);
  // Inicializacion fuera de la transaccion: dos primeras solicitudes pueden competir por el mismo contador.
  try { await Contador.updateOne({ _id: "pagos" }, { $setOnInsert: { valor: 0 } }, { upsert: true }); }
  catch (e) { if (!(e instanceof mongo.MongoServerError && e.code === 11000)) throw e; }
  const id = await mongoose.connection.transaction(async session => {
    const caja = await Caja.findOneAndUpdate({ usuario: actor.id, estado: "ABIERTA" }, { $inc: { revisionMovimientos: 1 } }, { session, returnDocument: "after" });
    if (!caja) throw AppError.unprocessable("Abre tu propia caja antes de registrar pagos");
    // Escritura compartida: serializa abonos de cajas distintas y cancelaciones de esta cita.
    const cita = await Cita.findOneAndUpdate({ _id: d.citaId }, { $inc: { revisionFinanciera: 1 } }, { session, returnDocument: "after" });
    if (!cita) throw AppError.notFound("Cita no encontrada");
    if (cita.estado === "CANCELADA") throw AppError.unprocessable("No se pueden registrar pagos de una cita cancelada");
    const pagado = await totalPagado(d.citaId, session);
    if (pagado + d.montoCentavos > cita.precioCentavos) throw AppError.unprocessable("El pago supera el saldo pendiente de la cita. Actualiza el saldo.");
    const contador = await Contador.findOneAndUpdate({ _id: "pagos" }, { $inc: { valor: 1 } }, { session, returnDocument: "after" });
    if (!contador || !Number.isSafeInteger(contador.valor)) throw new Error("Contador de comprobantes fuera de rango");
    const [pago] = await Pago.create([{ comprobante: `COMP-${hoyGuatemala().slice(0, 4)}-${String(contador.valor).padStart(6, "0")}`, paciente: cita.paciente, cita: cita.id, caja: caja.id, montoCentavos: d.montoCentavos, metodo: d.metodo, registradoPor: actor.id }], { session });
    return pago!.id as string;
  });
  return Pago.findById(id).populate(POPULAR);
}
export async function resumen(citaId: string) {
  const cita = await Cita.findById(citaId).populate({ path: "paciente", select: "nombres apellidos" }).populate({ path: "servicio", select: "nombre" });
  if (!cita) throw AppError.notFound("Cita no encontrada");
  const totalPagadoCentavos = await totalPagado(citaId);
  return { cita, costoCentavos: cita.precioCentavos, totalPagadoCentavos, saldoCentavos: cita.precioCentavos - totalPagadoCentavos, estadoFinanciero: totalPagadoCentavos === 0 ? "PENDIENTE" : totalPagadoCentavos < cita.precioCentavos ? "PARCIAL" : "PAGADO" };
}
export async function listar(f: { page: number; limit: number; pacienteId?: string; citaId?: string; desde?: string; hasta?: string; metodo?: IPago["metodo"] }) {
  const filtro: QueryFilter<IPago> = {};
  if (f.pacienteId) filtro.paciente = f.pacienteId;
  if (f.citaId) filtro.cita = f.citaId;
  if (f.metodo) filtro.metodo = f.metodo;
  if (f.desde || f.hasta) filtro.fecha = { ...(f.desde ? { $gte: aInstante(f.desde, "00:00") } : {}), ...(f.hasta ? { $lt: aInstante(sumarDias(f.hasta, 1), "00:00") } : {}) };
  const [items, total] = await Promise.all([Pago.find(filtro).sort({ fecha: -1, _id: -1 }).skip((f.page - 1) * f.limit).limit(f.limit).populate(POPULAR), Pago.countDocuments(filtro)]);
  return armarPagina(items, total, f.page, f.limit);
}
