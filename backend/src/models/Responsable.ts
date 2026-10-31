import { Schema, model, type HydratedDocument } from "mongoose";
import { normalizar } from "../utils/texto";
import { jsonTransform } from "../utils/toJSON";

export interface IResponsable {
  nombres: string;
  apellidos: string;
  parentesco: string;
  telefono: string;
  email: string;
  direccion: string;
  fotoUrl?: string;
  fotoKey?: string;
  busqueda: string;
  orden: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ResponsableDoc = HydratedDocument<IResponsable>;

/**
 * La relacion con los pacientes se guarda en UN solo lugar: `Paciente.responsables`.
 * Los pacientes de un responsable se obtienen consultando esa coleccion (asi no hay dos copias que desincronizar).
 */
const responsableSchema = new Schema<IResponsable>(
  {
    nombres: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    apellidos: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    parentesco: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    telefono: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    direccion: { type: String, required: true, trim: true, maxlength: 250 },
    fotoUrl: { type: String, trim: true },
    fotoKey: { type: String, trim: true },
    busqueda: { type: String, default: "" },
    orden: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "responsables",
    toJSON: { transform: jsonTransform(["busqueda", "orden"]) },
  },
);

responsableSchema.index({ orden: 1 });

responsableSchema.pre("save", function () {
  this.busqueda = normalizar(`${this.nombres} ${this.apellidos} ${this.email} ${this.telefono}`);
  this.orden = normalizar(`${this.apellidos} ${this.nombres}`);
});

export const Responsable = model<IResponsable>("Responsable", responsableSchema);
