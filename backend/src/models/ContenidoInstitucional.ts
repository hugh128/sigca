import { Schema, model, type Types } from "mongoose";
import { jsonTransform } from "../utils/toJSON";

/**
 * Cada seccion editable del portal es UN documento identificado por `clave`.
 * El contenido de `datos` se valida con Zod segun la clave (ver schemas/contenido.schema.ts).
 */
export const CLAVES_CONTENIDO = [
  "general", // nombre del centro, logo, pie de pagina, nota de horarios
  "inicio", // titulo, subtitulo, descripcion y carrusel
  "misionVision",
  "contacto", // direccion, telefono, correo, redes
  "corporativo", // capacitaciones y escuela para padres
  "educativo", // publicaciones informativas
] as const;
export type ClaveContenido = (typeof CLAVES_CONTENIDO)[number];

export interface IContenidoInstitucional {
  clave: ClaveContenido;
  datos: Record<string, unknown>;
  actualizadoPor?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contenidoSchema = new Schema<IContenidoInstitucional>(
  {
    clave: { type: String, enum: CLAVES_CONTENIDO, required: true, unique: true },
    datos: { type: Schema.Types.Mixed, required: true },
    actualizadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  {
    timestamps: true,
    minimize: false,
    collection: "contenidoInstitucional",
    toJSON: { transform: jsonTransform() },
  },
);

export const ContenidoInstitucional = model<IContenidoInstitucional>("ContenidoInstitucional", contenidoSchema);
