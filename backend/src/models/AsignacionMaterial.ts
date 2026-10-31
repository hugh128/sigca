import { Schema, model, type Types } from "mongoose";
import { jsonTransform } from "../utils/toJSON";
interface IAsignacion {
  paciente: Types.ObjectId; material: Types.ObjectId; asignadoPor: Types.ObjectId; createdAt: Date;
}
const schema = new Schema<IAsignacion>({
  paciente: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
  material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
  asignadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
}, { collection: "asignacionesMateriales", timestamps: { createdAt: true, updatedAt: false }, toJSON: { transform: jsonTransform(["paciente"]) } });
schema.index({ paciente: 1, material: 1 }, { unique: true });
schema.index({ paciente: 1, createdAt: -1 });
export const AsignacionMaterial = model<IAsignacion>("AsignacionMaterial", schema);
