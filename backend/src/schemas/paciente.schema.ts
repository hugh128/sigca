import { z } from "zod";
import { ESTADOS_PACIENTE, SEXOS } from "../models/Paciente";
import { esFechaValida, hoyGuatemala } from "../utils/fechas";
import { booleanQuery, objectId } from "./common.schema";

/** Letras (con tildes y ñ), espacios, apostrofe, punto y guion: "María José", "O'Connor", "De la Cruz". */
export const nombrePersona = (campo: string) =>
  z
    .string(`${campo} es obligatorio`)
    .trim()
    .min(2, `${campo}: mínimo 2 caracteres`)
    .max(80, `${campo}: máximo 80 caracteres`)
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, `${campo}: solo letras y espacios`);

export const telefono = z
  .string("El teléfono es obligatorio")
  .trim()
  .regex(/^\+?[\d][\d\s().-]{6,18}$/, "Teléfono inválido (usa solo números, espacios, guiones o +)");

export const fechaISO = z
  .string("La fecha es obligatoria")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
  .refine(esFechaValida, "La fecha no existe en el calendario");

/** Texto opcional: "" se trata como "no enviado". */
export const urlOpcional = z
  .union([z.url("URL inválida"), z.literal("")])
  .transform((v) => (v === "" ? undefined : v));

const camposPaciente = z.object({
  nombres: nombrePersona("Los nombres"),
  apellidos: nombrePersona("Los apellidos"),
  fechaNacimiento: fechaISO
    .refine((f) => f <= hoyGuatemala(), "La fecha de nacimiento no puede ser futura")
    .refine((f) => f >= "1900-01-01", "La fecha de nacimiento es demasiado antigua"),
  sexo: z.enum(SEXOS, "Sexo inválido"),
  telefono,
  direccion: z.string("La dirección es obligatoria").trim().min(3, "Dirección demasiado corta").max(250, "Máximo 250 caracteres"),
  /** Fecha de inicio del proceso. Si no se envia, se usa la de hoy. */
  fechaInicio: fechaISO.optional(),
  observaciones: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
  fotoUrl: urlOpcional.optional(),
  fotoKey: z.string().trim().max(300).optional(),
});

export const crearPacienteBody = camposPaciente.extend({
  /** Responsables ya registrados que se asocian al crear. */
  responsables: z.array(objectId).max(5, "Máximo 5 responsables").default([]),
});

/** En la actualizacion NO hay valores por defecto (un PUT parcial no debe pisar lo que no se envia). */
export const actualizarPacienteBody = camposPaciente
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo para actualizar");

export const estadoPacienteBody = z.object({ estado: z.enum(ESTADOS_PACIENTE, "Estado inválido") });

export const asociarResponsableBody = z.object({ responsableId: objectId });

export const paginacion = {
  page: z.coerce.number().int().min(1, "La página mínima es 1").default(1),
  limit: z.coerce.number().int().min(1).max(100, "Máximo 100 por página").default(20),
};

export const listarPacientesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  estado: z.enum(ESTADOS_PACIENTE).optional(),
  /** true: solo menores de 18; false: solo mayores */
  menores: booleanQuery.optional(),
  ...paginacion,
});
