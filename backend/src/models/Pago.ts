import { Schema, model, type Types } from "mongoose";
import { jsonTransform } from "../utils/toJSON";
export const METODOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "TARJETA"] as const;
export interface IPago {
  comprobante: string; paciente: Types.ObjectId; cita: Types.ObjectId; caja: Types.ObjectId;
  montoCentavos: number; metodo: typeof METODOS_PAGO[number]; fecha: Date;
  registradoPor: Types.ObjectId; estado: "REGISTRADO" | "ANULADO";
  motivoAnulacion?: string; anuladoPor?: Types.ObjectId; fechaAnulacion?: Date;
}
const schema = new Schema<IPago>({
  comprobante: { type: String, required: true, unique: true },
  paciente: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
  cita: { type: Schema.Types.ObjectId, ref: "Cita", required: true },
  caja: { type: Schema.Types.ObjectId, ref: "Caja", required: true },
  montoCentavos: { type: Number, required: true, min: 1, max: 999999999, validate: Number.isSafeInteger },
  metodo: { type: String, required: true, enum: METODOS_PAGO },
  fecha: { type: Date, default: Date.now }, registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  estado: { type: String, enum: ["REGISTRADO", "ANULADO"], default: "REGISTRADO" },
  motivoAnulacion: { type: String, trim: true, maxlength: 300 },
  anuladoPor: { type: Schema.Types.ObjectId, ref: "Usuario" }, fechaAnulacion: Date,
}, { collection: "pagos", toJSON: { transform: jsonTransform() } });
schema.index({ cita: 1, estado: 1 }); schema.index({ paciente: 1, fecha: -1 }); schema.index({ fecha: -1, _id: -1 }); schema.index({ caja: 1, estado: 1 });
export const Pago = model<IPago>("Pago", schema);
