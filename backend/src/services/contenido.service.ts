import type { Types } from "mongoose";
import { formatearErroresZod } from "../middlewares/validate";
import { CLAVES_CONTENIDO, ContenidoInstitucional, type ClaveContenido } from "../models/ContenidoInstitucional";
import { esquemasContenido } from "../schemas/contenido.schema";
import { AppError } from "../utils/AppError";
import { sinUndefined } from "../utils/sinUndefined";
import { CONTENIDO_POR_DEFECTO } from "./contenido.defaults";

/** Ajustes de presentacion: las publicaciones se muestran de la mas reciente a la mas antigua. */
function presentar(clave: ClaveContenido, datos: Record<string, unknown>): Record<string, unknown> {
  if (clave === "educativo") {
    const pubs = (datos.publicaciones as { fechaPublicacion: string }[]) ?? [];
    return { ...datos, publicaciones: [...pubs].sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion)) };
  }
  return datos;
}

/** Todas las secciones en un solo objeto (usa el contenido por defecto si una seccion aun no existe). */
export async function obtenerTodo(): Promise<Record<ClaveContenido, Record<string, unknown>>> {
  const docs = await ContenidoInstitucional.find();
  const resultado = {} as Record<ClaveContenido, Record<string, unknown>>;
  for (const clave of CLAVES_CONTENIDO) {
    const datos = docs.find((d) => d.clave === clave)?.datos ?? CONTENIDO_POR_DEFECTO[clave];
    resultado[clave] = presentar(clave, datos);
  }
  return resultado;
}

export async function obtener(clave: ClaveContenido): Promise<Record<string, unknown>> {
  const doc = await ContenidoInstitucional.findOne({ clave });
  return presentar(clave, doc?.datos ?? CONTENIDO_POR_DEFECTO[clave]);
}

/** Reemplaza el contenido completo de una seccion, validandolo segun su clave. */
export async function guardar(clave: ClaveContenido, cuerpo: unknown, usuarioId: Types.ObjectId | string) {
  const r = esquemasContenido[clave].safeParse(cuerpo ?? {});
  if (!r.success) throw AppError.badRequest("Datos inválidos", formatearErroresZod(r.error));

  const doc = await ContenidoInstitucional.findOneAndUpdate(
    { clave },
    { $set: { datos: sinUndefined(r.data), actualizadoPor: usuarioId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return presentar(clave, doc.datos);
}
