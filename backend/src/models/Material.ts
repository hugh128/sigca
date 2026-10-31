import { Schema, model } from "mongoose";
import { jsonTransform } from "../utils/toJSON";
export interface IMaterial {
  titulo: string; descripcion: string; tipo: string; enlace: string;
  estado: "ACTIVO" | "INACTIVO"; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<IMaterial>({
  titulo: { type: String, required: true, trim: true, maxlength: 160 },
  descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
  tipo: { type: String, required: true, trim: true, maxlength: 60 },
  enlace: { type: String, required: true, maxlength: 2000 },
  estado: { type: String, enum: ["ACTIVO", "INACTIVO"], default: "ACTIVO", index: true },
}, { collection: "materiales", timestamps: true, toJSON: { transform: jsonTransform() } });
export const Material = model<IMaterial>("Material", schema);
