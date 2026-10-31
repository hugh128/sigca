import { z } from "zod";
import { objectId } from "./common.schema";
import { paginacion } from "./paciente.schema";
// Solo enlaces navegables; nunca ejecutar esquemas javascript/data ni guardar credenciales en la URL.
const enlace = z.string().trim().max(2000).pipe(z.httpUrl("Usa un enlace http o https válido")).refine(v => {
  try { const url = new URL(v); return !url.username && !url.password; } catch { return false; }
}, "El enlace no debe incluir credenciales");
export const crearMaterialBody = z.object({
  titulo: z.string().trim().min(2).max(160), descripcion: z.string().trim().min(3).max(2000),
  tipo: z.string().trim().min(2).max(60), enlace,
});
export const actualizarMaterialBody = crearMaterialBody.partial().refine(v => Object.keys(v).length > 0, "Envía al menos un campo");
export const estadoMaterialBody = z.object({ estado: z.enum(["ACTIVO", "INACTIVO"]) });
export const listarMaterialesQuery = z.object({ ...paginacion, q: z.string().trim().max(100).optional(), estado: estadoMaterialBody.shape.estado.optional() });
export const paginaAsignacionesQuery = z.object(paginacion);
export const asignarMaterialBody = z.object({ materialId: objectId });
