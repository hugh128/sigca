import { Schema, model } from "mongoose";
import { jsonTransform } from "../utils/toJSON";

export interface IMensajeContacto {
  nombre: string;
  correo: string;
  telefono: string;
  asunto: string;
  mensaje: string;
  fecha: Date;
}

const schema = new Schema<IMensajeContacto>({
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  correo: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  telefono: { type: String, required: true, trim: true, maxlength: 20 },
  asunto: { type: String, required: true, trim: true, maxlength: 150 },
  mensaje: { type: String, required: true, trim: true, maxlength: 3000 },
  fecha: { type: Date, default: Date.now, immutable: true },
}, { collection: "mensajesContacto", toJSON: { transform: jsonTransform() } });
schema.index({ fecha: -1, _id: -1 });
export const MensajeContacto = model<IMensajeContacto>("MensajeContacto", schema);
