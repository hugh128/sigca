import type { RequestHandler } from "express";
import type { ZodError, ZodType } from "zod";
import { AppError } from "../utils/AppError";

interface Esquemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

export function formatearErroresZod(error: ZodError): ErrorCampo[] {
  return error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message }));
}

/**
 * Valida body, params y query con Zod. Si todo es valido, reemplaza los valores
 * por los ya parseados (con transformaciones y valores por defecto aplicados).
 * Si algo falla responde 400 con el detalle por campo.
 */
export function validate(esquemas: Esquemas): RequestHandler {
  return (req, _res, next) => {
    const errores: ErrorCampo[] = [];

    if (esquemas.body) {
      const r = esquemas.body.safeParse(req.body ?? {});
      if (r.success) req.body = r.data;
      else errores.push(...formatearErroresZod(r.error));
    }
    if (esquemas.params) {
      const r = esquemas.params.safeParse(req.params);
      if (r.success) Object.defineProperty(req, "params", { value: r.data, writable: true, configurable: true });
      else errores.push(...formatearErroresZod(r.error));
    }
    if (esquemas.query) {
      const r = esquemas.query.safeParse(req.query);
      // En Express 5 `req.query` es de solo lectura: se redefine en la instancia.
      if (r.success) Object.defineProperty(req, "query", { value: r.data, writable: true, configurable: true });
      else errores.push(...formatearErroresZod(r.error));
    }

    if (errores.length > 0) return next(AppError.badRequest("Datos inválidos", errores));
    next();
  };
}
