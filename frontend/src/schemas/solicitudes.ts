import { z } from "zod";
import { esFechaValida, hoyGuatemala } from "@/lib/fechas";
import { telefono } from "./comun";

export const solicitudSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(120),
  correo: z.string().trim().toLowerCase().max(254).pipe(z.email("Escribe un correo válido")),
  telefono,
  servicioId: z.string().min(1, "Elige el servicio"),
  fechaPreferida: z.string().min(1, "Elige una fecha").refine(esFechaValida, "La fecha no existe").refine(f => f >= hoyGuatemala(), "Elige una fecha de hoy en adelante"),
  mensaje: z.string().trim().max(1000, "Máximo 1000 caracteres"),
});
export type DatosSolicitud = z.infer<typeof solicitudSchema>;
