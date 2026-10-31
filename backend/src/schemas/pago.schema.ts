import { z } from "zod";
import { METODOS_PAGO } from "../models/Pago";
import { objectId } from "./common.schema";
import { fechaISO, paginacion } from "./paciente.schema";
export const crearPagoBody = z.object({ citaId: objectId, montoCentavos: z.number("Indica el monto en centavos").int("Usa centavos enteros").positive("El monto debe ser mayor a cero").max(999999999), metodo: z.enum(METODOS_PAGO) });
export const listarPagosQuery = z.object({ ...paginacion, pacienteId: objectId.optional(), citaId: objectId.optional(), desde: fechaISO.optional(), hasta: fechaISO.optional(), metodo: z.enum(METODOS_PAGO).optional() }).refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, "La fecha inicial no puede ser posterior a la final");
