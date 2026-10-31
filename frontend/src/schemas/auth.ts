import { z } from "zod";

/** Los mismos mensajes se muestran bajo cada campo (TanStack Form entiende esquemas Zod directamente). */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Escribe tu correo electrónico").pipe(z.email("Escribe un correo válido, por ejemplo nombre@centro.com")),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type LoginValores = z.infer<typeof loginSchema>;
