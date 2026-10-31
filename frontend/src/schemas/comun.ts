import { z } from "zod";

/** Letras (con tildes y ñ), espacios, apostrofe, punto y guion: «María José», «O'Connor». */
export const nombrePersona = (campo: string) =>
  z
    .string()
    .trim()
    .min(2, `${campo}: escribe al menos 2 caracteres`)
    .max(80, `${campo}: máximo 80 caracteres`)
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, `${campo}: solo letras y espacios`);

export const telefono = z
  .string()
  .trim()
  .min(1, "Escribe el teléfono")
  .regex(/^\+?[\d][\d\s().-]{6,18}$/, "Teléfono inválido. Usa números, espacios o guiones, por ejemplo 5555-1234");

export const direccion = z.string().trim().min(3, "Escribe la dirección").max(250, "Máximo 250 caracteres");

export const fotoUrl = z.union([z.literal(""), z.url("Escribe una dirección web válida, por ejemplo https://…")]);
