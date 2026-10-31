import { z } from "zod";
import { ESTADOS_CITA } from "../models/Cita";
import { objectId } from "./common.schema";
import { fechaISO, paginacion } from "./paciente.schema";


export const hora = z
  .string("La hora es obligatoria")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener el formato HH:mm (24 horas), por ejemplo 09:30");

/** Fecha y hora de PARED en Guatemala. El servidor calcula la hora de fin con la duracion del servicio (RN-12). */
export const crearCitaBody = z.object({
  pacienteId: objectId,
  servicioId: objectId,
  profesionalId: objectId,
  fecha: fechaISO,
  horaInicio: hora,
  observaciones: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

/** Reprogramar o editar. No admite cambiar el paciente ni el servicio: para eso se cancela y se programa otra. */
export const actualizarCitaBody = z
  .object({
    fecha: fechaISO,
    horaInicio: hora,
    profesionalId: objectId,
    observaciones: z.string().trim().max(500, "Máximo 500 caracteres"),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo para actualizar");

export const estadoCitaBody = z.object({
  estado: z.enum(ESTADOS_CITA, "Estado inválido"),
  /** Solo se guarda al cancelar. */
  motivo: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
});

/** estado=PENDIENTE,CONFIRMADA -> ["PENDIENTE","CONFIRMADA"] */
const listaDeEstados = z
  .string()
  .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.enum(ESTADOS_CITA, "Estado inválido")).min(1));

export const listarCitasQuery = z
  .object({
    /** Dia inicial y final (ambos incluidos), en fecha de Guatemala. */
    desde: fechaISO.optional(),
    hasta: fechaISO.optional(),
    estado: listaDeEstados.optional(),
    profesionalId: objectId.optional(),
    pacienteId: objectId.optional(),
    servicioId: objectId.optional(),
    orden: z.enum(["asc", "desc"]).default("asc"),
    page: paginacion.page,
    limit: z.coerce.number().int().min(1).max(500, "Máximo 500 por página").default(50),
  })
  .refine((v) => !v.desde || !v.hasta || v.desde <= v.hasta, { message: "«desde» no puede ser posterior a «hasta»", path: ["desde"] });

export const disponibilidadQuery = z.object({
  profesionalId: objectId,
  servicioId: objectId,
  fecha: fechaISO,
  /** Al reprogramar, la propia cita no cuenta como ocupada. */
  excluirCitaId: objectId.optional(),
});
