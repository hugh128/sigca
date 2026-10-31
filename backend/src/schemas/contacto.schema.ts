import { z } from "zod";
import { paginacion, telefono } from "./paciente.schema";

export const contactoBody = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre (mínimo 2 caracteres)").max(120, "Máximo 120 caracteres"),
  correo: z.string().trim().toLowerCase().max(254, "Máximo 254 caracteres").pipe(z.email("Escribe un correo válido")),
  telefono,
  asunto: z.string().trim().min(3, "Escribe el asunto (mínimo 3 caracteres)").max(150, "Máximo 150 caracteres"),
  mensaje: z.string().trim().min(10, "Escribe tu mensaje (mínimo 10 caracteres)").max(3000, "Máximo 3000 caracteres"),
});
export const contactoQuery = z.object(paginacion);
export type DatosContacto = z.infer<typeof contactoBody>;
