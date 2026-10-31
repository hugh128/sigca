import { Schema, model, type HydratedDocument } from "mongoose";
import { jsonTransform } from "../utils/toJSON";

export const ROLES = ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"] as const;
export type Rol = (typeof ROLES)[number];

export interface IUsuario {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  /** Si se define, los tokens emitidos antes de esta fecha dejan de ser validos. */
  passwordChangedAt?: Date;
  /** Escritura compartida que serializa las reservas de agenda dentro de transacciones. */
  revisionAgenda?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UsuarioDoc = HydratedDocument<IUsuario>;

const usuarioSchema = new Schema<IUsuario>(
  {
    nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, enum: ROLES, required: true, index: true },
    activo: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, select: false },
    revisionAgenda: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    collection: "usuarios",
    toJSON: { transform: jsonTransform(["passwordHash", "passwordChangedAt", "revisionAgenda"]) },
  },
);

export const Usuario = model<IUsuario>("Usuario", usuarioSchema);
