import { z } from "zod";

export const loginBody = z.object({
  email: z.email("Correo electrónico inválido").transform((v) => v.trim().toLowerCase()),
  // En el login NO se aplica la politica de contrasena: solo que venga un texto.
  password: z.string("La contraseña es obligatoria").min(1, "La contraseña es obligatoria").max(200),
});
