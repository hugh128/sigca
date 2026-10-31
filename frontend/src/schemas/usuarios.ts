import { z } from "zod";

const nombre = z.string().trim().min(2, "Escribe el nombre completo (mínimo 2 caracteres)").max(120, "Máximo 120 caracteres");
const email = z.string().trim().min(1, "Escribe el correo electrónico").pipe(z.email("Escribe un correo válido, por ejemplo nombre@centro.com"));
const rol = z.enum(["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"], "Elige un rol");

/** Misma politica que el backend (RN-09): 8 a 72 caracteres, con al menos una letra y un numero. */
export const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
  .regex(/\d/, "Debe incluir al menos un número");

export const crearUsuarioSchema = z.object({ nombre, email, rol, password });
export const editarUsuarioSchema = z.object({ nombre, email, rol, password: z.string() });

export const restablecerPasswordSchema = z
  .object({ password, confirmar: z.string().min(1, "Repite la contraseña") })
  .refine((v) => v.password === v.confirmar, { message: "Las contraseñas no coinciden", path: ["confirmar"] });
