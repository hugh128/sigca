import { z } from "zod";
import { esFechaValida, hoyGuatemala } from "@/lib/fechas";

export const citaFormSchema = z.object({
  pacienteId: z.string().min(1, "Elige al paciente"),
  servicioId: z.string().min(1, "Elige el servicio"),
  profesionalId: z.string().min(1, "Elige al profesional"),
  fecha: z
    .string()
    .min(1, "Elige la fecha")
    .refine(esFechaValida, "La fecha no existe en el calendario")
    .refine((f) => f >= hoyGuatemala(), "No se pueden programar citas en fechas pasadas"),
  horaInicio: z.string().min(1, "Elige uno de los horarios disponibles"),
  observaciones: z.string().trim().max(500, "Máximo 500 caracteres"),
});
