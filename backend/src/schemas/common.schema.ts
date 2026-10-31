import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Identificador inválido");

export const idParams = z.object({ id: objectId });

/** Query string "true"/"false" -> boolean */
export const booleanQuery = z.enum(["true", "false"]).transform((v) => v === "true");

export const passwordSchema = z
  .string("La contraseña es obligatoria")
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar 72 caracteres")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra")
  .regex(/\d/, "La contraseña debe incluir al menos un número");
