import { Schema, model, type HydratedDocument } from "mongoose";
import { jsonTransform } from "../utils/toJSON";

export const ESTADOS_SERVICIO = ["ACTIVO", "INACTIVO"] as const;
export type EstadoServicio = (typeof ESTADOS_SERVICIO)[number];

export interface IServicio {
  nombre: string;
  descripcion: string;
  duracionMin: number;
  /** Precio en CENTAVOS de quetzal (RN-28). */
  precioCentavos: number;
  imagenUrl?: string;
  /** Llave del objeto en el almacenamiento (R2), para poder reemplazar/eliminar la imagen. */
  imagenKey?: string;
  estado: EstadoServicio;
  createdAt: Date;
  updatedAt: Date;
}

export type ServicioDoc = HydratedDocument<IServicio>;

const servicioSchema = new Schema<IServicio>(
  {
    nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    descripcion: { type: String, required: true, trim: true, maxlength: 1000 },
    duracionMin: { type: Number, required: true, min: 5, max: 480, validate: Number.isInteger },
    precioCentavos: { type: Number, required: true, min: 1, validate: Number.isInteger },
    imagenUrl: { type: String, trim: true },
    imagenKey: { type: String, trim: true },
    estado: { type: String, enum: ESTADOS_SERVICIO, default: "ACTIVO", index: true },
  },
  {
    timestamps: true,
    collection: "servicios",
    toJSON: { transform: jsonTransform() },
  },
);

export const Servicio = model<IServicio>("Servicio", servicioSchema);
