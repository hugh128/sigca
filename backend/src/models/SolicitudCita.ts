import { Schema, model, type Types } from "mongoose";
import { jsonTransform } from "../utils/toJSON";

export const ESTADOS_SOLICITUD = ["PENDIENTE", "ATENDIDA", "RECHAZADA"] as const;
export type EstadoSolicitud = typeof ESTADOS_SOLICITUD[number];
export interface ISolicitudCita {
  nombre: string;
  correo: string;
  telefono: string;
  servicio: Types.ObjectId;
  fechaPreferida: string;
  mensaje?: string;
  estado: EstadoSolicitud;
  cita?: Types.ObjectId;
  gestionadoPor?: Types.ObjectId;
  fechaGestion?: Date;
  motivoRechazo?: string;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<ISolicitudCita>({
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  correo: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  telefono: { type: String, required: true, trim: true, maxlength: 20 },
  servicio: { type: Schema.Types.ObjectId, ref: "Servicio", required: true },
  fechaPreferida: { type: String, required: true },
  mensaje: { type: String, trim: true, maxlength: 1000 },
  estado: { type: String, enum: ESTADOS_SOLICITUD, default: "PENDIENTE" },
  cita: { type: Schema.Types.ObjectId, ref: "Cita" },
  gestionadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  fechaGestion: Date,
  motivoRechazo: { type: String, trim: true, maxlength: 300 },
}, { timestamps: true, collection: "solicitudesCita", toJSON: { transform: jsonTransform() } });
schema.index({ estado: 1, createdAt: -1, _id: -1 });
schema.index({ cita: 1 }, { unique: true, partialFilterExpression: { cita: { $type: "objectId" } } });
export const SolicitudCita = model<ISolicitudCita>("SolicitudCita", schema);
