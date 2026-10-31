import { Schema, model } from "mongoose";
const schema = new Schema<{ _id: string; valor: number }>({ _id: String, valor: { type: Number, required: true, default: 0 } }, { collection: "contadores" });
export const Contador = model("Contador", schema);
