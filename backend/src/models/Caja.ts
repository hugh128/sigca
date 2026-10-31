import { Schema, model, type Types } from "mongoose";
import { jsonTransform } from "../utils/toJSON";
export const ESTADOS_CAJA = ["ABIERTA", "CERRADA"] as const;
export interface TotalesCaja {
  totalEfectivoCentavos: number; totalTransferenciaCentavos: number; totalTarjetaCentavos: number;
  totalIngresosCentavos: number; efectivoEsperadoCentavos: number;
}
export interface ICaja {
  usuario: Types.ObjectId;
  apertura: Date;
  montoInicialCentavos: number;
  revisionMovimientos?: number;
  cierre?: Date; cerradoPor?: Types.ObjectId; efectivoContadoCentavos?: number; diferenciaCentavos?: number; totalesCierre?: TotalesCaja;
  estado: typeof ESTADOS_CAJA[number];
}
const totalesSchema = new Schema<TotalesCaja>({
  totalEfectivoCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  totalTransferenciaCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  totalTarjetaCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  totalIngresosCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  efectivoEsperadoCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
}, { _id: false });
const schema = new Schema<ICaja>({
  usuario: { type: Schema.Types.ObjectId, ref: "Usuario", required: true, immutable: true },
  apertura: { type: Date, default: Date.now, immutable: true },
  montoInicialCentavos: { type: Number, required: true, min: 0, max: 999999999, validate: Number.isSafeInteger, immutable: true },
  estado: { type: String, enum: ESTADOS_CAJA, default: "ABIERTA", required: true },
  revisionMovimientos: { type: Number, default: 0, select: false },
  cierre: Date, cerradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  efectivoContadoCentavos: { type: Number, min: 0, max: 999999999, validate: Number.isSafeInteger },
  diferenciaCentavos: { type: Number, validate: Number.isSafeInteger }, totalesCierre: totalesSchema,
}, { collection: "cajas", toJSON: { transform: jsonTransform(["revisionMovimientos"]) } });
schema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { estado: "ABIERTA" }, name: "una_caja_abierta_por_usuario" });
schema.index({ apertura: -1, _id: -1 });
export const Caja = model<ICaja>("Caja", schema);
