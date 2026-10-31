import { z } from "zod";
import { ESTADOS_SERVICIO } from "../models/Servicio";

const imagenUrl = z
  .union([z.url("URL de imagen inválida"), z.literal("")])
  .transform((v) => (v === "" ? undefined : v));

const camposServicio = z.object({
  nombre: z.string("El nombre es obligatorio").trim().min(2, "Mínimo 2 caracteres").max(120),
  descripcion: z.string("La descripción es obligatoria").trim().min(1, "La descripción es obligatoria").max(1000),
  duracionMin: z
    .number("La duración es obligatoria")
    .int("Debe ser un número entero de minutos")
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 480 minutos"),
  /** Centavos enteros: Q250.00 => 25000 */
  precioCentavos: z
    .number("El precio es obligatorio")
    .int("El precio debe enviarse en centavos enteros")
    .positive("El precio debe ser mayor a cero")
    .max(100_000_00, "Precio fuera de rango"),
  imagenUrl: imagenUrl.optional(),
  imagenKey: z.string().trim().max(300).optional(),
});

export const crearServicioBody = camposServicio.extend({
  estado: z.enum(ESTADOS_SERVICIO).default("ACTIVO"),
});

/**
 * OJO: al actualizar, `estado` NO lleva valor por defecto. Con `.partial()` sobre el esquema de
 * creacion, un PUT que solo cambia el precio reactivaba (ACTIVO) un servicio inactivo.
 */
export const actualizarServicioBody = camposServicio
  .partial()
  .extend({ estado: z.enum(ESTADOS_SERVICIO).optional() })
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo para actualizar");

export const estadoServicioBody = z.object({ estado: z.enum(ESTADOS_SERVICIO, "Estado inválido") });

export const listarServiciosQuery = z.object({
  estado: z.enum(ESTADOS_SERVICIO).optional(),
  q: z.string().trim().max(100).optional(),
});
