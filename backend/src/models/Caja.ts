import { Schema, model, type Types } from "mongoose";
import { jsonTransform } from "../utils/toJSON";
export const ESTADOS_CAJA = ["ABIERTA", "CERRADA"] as const;
export interface ICaja {
  usuario: Types.ObjectId;
  apertura: Date;
  montoInicialCentavos: number;
  revisionMovimientos?: number;
  estado: typeof ESTADOS_CAJA[number];
}
const schema = new Schema<ICaja>({
  usuario: { type: Schema.Types.ObjectId, ref: "Usuario", required: true, immutable: true },
  apertura: { type: Date, default: Date.now, immutable: true },
  montoInicialCentavos: { type: Number, required: true, min: 0, max: 999999999, validate: Number.isSafeInteger, immutable: true },
  estado: { type: String, enum: ESTADOS_CAJA, default: "ABIERTA", required: true },
  revisionMovimientos: { type: Number, default: 0, select: false },
}, { collection: "cajas", toJSON: { transform: jsonTransform(["revisionMovimientos"]) } });
schema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { estado: "ABIERTA" }, name: "una_caja_abierta_por_usuario" });
schema.index({ apertura: -1, _id: -1 });
export const Caja = model<ICaja>("Caja", schema);
