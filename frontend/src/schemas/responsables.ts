import { z } from "zod";
import { direccion, fotoUrl, nombrePersona, telefono } from "./comun";

export const responsableFormSchema = z.object({
  nombres: nombrePersona("Los nombres"),
  apellidos: nombrePersona("Los apellidos"),
  parentesco: z.string().trim().min(2, "Escribe el parentesco, por ejemplo Madre").max(60, "Máximo 60 caracteres"),
  telefono,
  email: z.string().trim().min(1, "Escribe el correo electrónico").pipe(z.email("Escribe un correo válido, por ejemplo nombre@correo.com")),
  direccion,
  fotoUrl,
  fotoKey: z.string(),
});
