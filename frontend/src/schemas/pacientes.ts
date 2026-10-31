import { z } from "zod";
import { esFechaValida, hoyGuatemala } from "@/lib/fechas";
import { direccion, fotoUrl, nombrePersona, telefono } from "./comun";

const fecha = (campo: string) =>
  z.string().min(1, `Elige ${campo}`).refine(esFechaValida, "La fecha no existe en el calendario");

export const pacienteFormSchema = z.object({
  nombres: nombrePersona("Los nombres"),
  apellidos: nombrePersona("Los apellidos"),
  fechaNacimiento: fecha("la fecha de nacimiento")
    .refine((f) => f <= hoyGuatemala(), "La fecha de nacimiento no puede ser futura")
    .refine((f) => f >= "1900-01-01", "La fecha de nacimiento es demasiado antigua"),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"], "Elige el sexo"),
  telefono,
  direccion,
  fechaInicio: fecha("la fecha de inicio del proceso"),
  observaciones: z.string().trim().max(1000, "Máximo 1000 caracteres"),
  fotoUrl,
  fotoKey: z.string(),
});
