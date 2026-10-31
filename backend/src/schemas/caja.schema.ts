import { z } from "zod";
import { ESTADOS_CAJA } from "../models/Caja";
import { objectId } from "./common.schema";
import { paginacion } from "./paciente.schema";
export const abrirCajaBody = z.object({
  montoInicialCentavos: z.number("Indica el monto inicial en centavos").int("Usa centavos enteros").min(0, "El monto inicial no puede ser negativo").max(999999999, "Monto inicial fuera de rango"),
});
export const listarCajasQuery = z.object({ ...paginacion, estado: z.enum(ESTADOS_CAJA).optional(), usuarioId: objectId.optional() });
export const cerrarCajaBody = z.object({ efectivoContadoCentavos: z.number("Indica el efectivo contado en centavos").int("Usa centavos enteros").min(0, "El efectivo contado no puede ser negativo").max(999999999, "Monto fuera de rango") });
export const movimientosCajaQuery = z.object(paginacion);
