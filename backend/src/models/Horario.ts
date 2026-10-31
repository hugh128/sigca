import { Schema, model } from "mongoose";
import { jsonTransform } from "../utils/toJSON";

export const DIAS_SEMANA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface IFranja {
  /** Formato "HH:mm" en 24 horas. */
  inicio: string;
  fin: string;
}

export interface IHorario {
  dia: DiaSemana;
  atiende: boolean;
  /** Un dia puede tener varias franjas (p. ej. manana y tarde con receso al mediodia). */
  franjas: IFranja[];
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const franjaSchema = new Schema<IFranja>(
  {
    inicio: { type: String, required: true, match: HORA },
    fin: { type: String, required: true, match: HORA },
  },
  { _id: false },
);

const horarioSchema = new Schema<IHorario>(
  {
    dia: { type: String, enum: DIAS_SEMANA, required: true, unique: true },
    atiende: { type: Boolean, default: false },
    franjas: { type: [franjaSchema], default: [] },
  },
  { collection: "horarios", toJSON: { transform: jsonTransform() } },
);

export const Horario = model<IHorario>("Horario", horarioSchema);
