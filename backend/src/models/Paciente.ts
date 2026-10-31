import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { calcularEdad, MAYORIA_DE_EDAD } from "../utils/fechas";
import { normalizar } from "../utils/texto";
import { jsonTransform } from "../utils/toJSON";

export const SEXOS = ["MASCULINO", "FEMENINO", "OTRO"] as const;
export type Sexo = (typeof SEXOS)[number];
export const ESTADOS_PACIENTE = ["ACTIVO", "INACTIVO"] as const;
export type EstadoPaciente = (typeof ESTADOS_PACIENTE)[number];

export interface IPaciente {
  nombres: string;
  apellidos: string;
  /** AAAA-MM-DD */
  fechaNacimiento: string;
  sexo: Sexo;
  telefono: string;
  direccion: string;
  /** Fecha de inicio del proceso, AAAA-MM-DD */
  fechaInicio: string;
  observaciones?: string;
  fotoUrl?: string;
  fotoKey?: string;
  /** Eliminacion logica: un paciente nunca se borra, se desactiva. */
  estado: EstadoPaciente;
  responsables: Types.ObjectId[];
  /** Texto normalizado (sin tildes) para buscar. No se expone en la API. */
  busqueda: string;
  /** Apellidos + nombres normalizado, para ordenar sin que las tildes alteren el orden. */
  orden: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PacienteDoc = HydratedDocument<IPaciente>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const pacienteSchema = new Schema<IPaciente>(
  {
    nombres: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    apellidos: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    fechaNacimiento: { type: String, required: true, match: FECHA },
    sexo: { type: String, enum: SEXOS, required: true },
    telefono: { type: String, required: true, trim: true, maxlength: 20 },
    direccion: { type: String, required: true, trim: true, maxlength: 250 },
    fechaInicio: { type: String, required: true, match: FECHA },
    observaciones: { type: String, trim: true, maxlength: 1000 },
    fotoUrl: { type: String, trim: true },
    fotoKey: { type: String, trim: true },
    estado: { type: String, enum: ESTADOS_PACIENTE, default: "ACTIVO" },
    responsables: [{ type: Schema.Types.ObjectId, ref: "Responsable" }],
    busqueda: { type: String, default: "" },
    orden: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "pacientes",
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        jsonTransform(["busqueda", "orden"])(doc, ret);
        // La edad se calcula siempre al responder (nunca se guarda): asi no se desactualiza.
        const edad = calcularEdad(String(ret.fechaNacimiento));
        ret.edad = edad;
        ret.esMenor = edad < MAYORIA_DE_EDAD;
        return ret;
      },
    },
  },
);

pacienteSchema.index({ estado: 1, orden: 1 });
pacienteSchema.index({ responsables: 1 });
pacienteSchema.index({ fechaNacimiento: 1 });

pacienteSchema.pre("save", function () {
  this.busqueda = normalizar(`${this.nombres} ${this.apellidos} ${this.telefono}`);
  this.orden = normalizar(`${this.apellidos} ${this.nombres}`);
});

export const Paciente = model<IPaciente>("Paciente", pacienteSchema);
