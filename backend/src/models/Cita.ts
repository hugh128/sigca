import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { partesGuatemala } from "../utils/fechas";
import { jsonTransform } from "../utils/toJSON";

export const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA"] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];
/** Estados que ocupan la agenda (RN-13: las canceladas y completadas no bloquean horarios). */
export const ESTADOS_QUE_BLOQUEAN: EstadoCita[] = ["PENDIENTE", "CONFIRMADA"];

export interface IMovimientoCita {
  estado: EstadoCita;
  fecha: Date;
  usuario: Types.ObjectId;
  nota?: string;
}

export interface ICita {
  paciente: Types.ObjectId;
  servicio: Types.ObjectId;
  profesional: Types.ObjectId;
  /** Instantes exactos (UTC). La fecha y hora "de pared" de Guatemala se derivan al responder. */
  inicio: Date;
  fin: Date;
  /** Copiados del servicio al programar (RF-07): si el servicio cambia, la cita conserva los suyos. */
  duracionMin: number;
  precioCentavos: number;
  revisionFinanciera?: number;
  estado: EstadoCita;
  observaciones?: string;
  motivoCancelacion?: string;
  creadoPor: Types.ObjectId;
  /** Historial de cambios de estado y reprogramaciones (se conserva siempre). */
  historial: IMovimientoCita[];
  createdAt: Date;
  updatedAt: Date;
}

export type CitaDoc = HydratedDocument<ICita>;

const movimientoSchema = new Schema<IMovimientoCita>(
  {
    estado: { type: String, enum: ESTADOS_CITA, required: true },
    fecha: { type: Date, required: true },
    usuario: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    nota: { type: String, trim: true, maxlength: 400 },
  },
  { _id: false },
);

const citaSchema = new Schema<ICita>(
  {
    paciente: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
    servicio: { type: Schema.Types.ObjectId, ref: "Servicio", required: true },
    profesional: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    inicio: { type: Date, required: true },
    fin: { type: Date, required: true },
    duracionMin: { type: Number, required: true, min: 5, validate: Number.isInteger },
    precioCentavos: { type: Number, required: true, min: 1, validate: Number.isInteger },
    revisionFinanciera: { type: Number, default: 0, select: false },
    estado: { type: String, enum: ESTADOS_CITA, default: "PENDIENTE" },
    observaciones: { type: String, trim: true, maxlength: 500 },
    motivoCancelacion: { type: String, trim: true, maxlength: 300 },
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    historial: { type: [movimientoSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "citas",
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        jsonTransform(["revisionFinanciera"])(doc, ret);
        // Fecha y horas en hora de Guatemala: el cliente no necesita convertir zonas horarias.
        const ini = partesGuatemala(ret.inicio as Date);
        ret.fecha = ini.fecha;
        ret.horaInicio = ini.hora;
        ret.horaFin = partesGuatemala(ret.fin as Date).hora;
        return ret;
      },
    },
  },
);

citaSchema.index({ profesional: 1, inicio: 1 });
citaSchema.index({ paciente: 1, inicio: -1 });
citaSchema.index({ estado: 1, inicio: 1 });

export const Cita = model<ICita>("Cita", citaSchema);
