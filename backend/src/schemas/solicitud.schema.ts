import { z } from "zod";
import { ESTADOS_SOLICITUD } from "../models/SolicitudCita";
import { hoyGuatemala } from "../utils/fechas";
import { crearCitaBody } from "./cita.schema";
import { objectId } from "./common.schema";
import { fechaISO, paginacion, telefono } from "./paciente.schema";

export const crearSolicitudBody = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(120),
  correo: z.string().trim().toLowerCase().max(254).pipe(z.email("Escribe un correo válido")),
  telefono,
  servicioId: objectId,
  fechaPreferida: fechaISO.refine(f => f >= hoyGuatemala(), "Elige una fecha de hoy en adelante"),
  mensaje: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
});
export const listarSolicitudesQuery = z.object({ ...paginacion, estado: z.enum(ESTADOS_SOLICITUD).optional() });
export const convertirSolicitudBody = crearCitaBody.omit({ servicioId: true });
export const rechazarSolicitudBody = z.object({ motivo: z.string().trim().max(300, "Máximo 300 caracteres").optional() });
