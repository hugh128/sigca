import { z } from "zod";
import { objectId } from "./common.schema";
import { nombrePersona, paginacion, telefono, urlOpcional } from "./paciente.schema";

const camposResponsable = z.object({
  nombres: nombrePersona("Los nombres"),
  apellidos: nombrePersona("Los apellidos"),
  parentesco: z.string("El parentesco es obligatorio").trim().min(2, "Parentesco demasiado corto").max(60, "Máximo 60 caracteres"),
  telefono,
  email: z.email("Correo electrónico inválido").transform((v) => v.trim().toLowerCase()),
  direccion: z.string("La dirección es obligatoria").trim().min(3, "Dirección demasiado corta").max(250, "Máximo 250 caracteres"),
  fotoUrl: urlOpcional.optional(),
  fotoKey: z.string().trim().max(300).optional(),
});

export const crearResponsableBody = camposResponsable.extend({
  /** Pacientes ya registrados a los que se asocia al crearlo. */
  pacientes: z.array(objectId).max(20, "Máximo 20 pacientes").default([]),
});

export const actualizarResponsableBody = camposResponsable
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo para actualizar");

export const asociarPacienteBody = z.object({ pacienteId: objectId });

export const listarResponsablesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  ...paginacion,
});
