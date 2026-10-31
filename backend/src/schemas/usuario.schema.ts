import { z } from "zod";
import { ROLES } from "../models/Usuario";
import { booleanQuery, passwordSchema } from "./common.schema";

const email = z.email("Correo electrónico inválido").transform((v) => v.trim().toLowerCase());
const nombre = z.string("El nombre es obligatorio").trim().min(2, "Mínimo 2 caracteres").max(120);
const rol = z.enum(ROLES, "Rol inválido");

export const crearUsuarioBody = z.object({ nombre, email, password: passwordSchema, rol });

export const actualizarUsuarioBody = z
  .object({ nombre, email, rol, activo: z.boolean("Debe ser verdadero o falso") })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo para actualizar");

export const estadoUsuarioBody = z.object({ activo: z.boolean("Debe ser verdadero o falso") });

export const resetPasswordBody = z.object({ password: passwordSchema });

export const listarUsuariosQuery = z.object({
  rol: z.enum(ROLES).optional(),
  activo: booleanQuery.optional(),
  q: z.string().trim().max(100).optional(),
});
