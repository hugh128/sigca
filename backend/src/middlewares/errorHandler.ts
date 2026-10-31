import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { isProd } from "../config/env";
import { AppError } from "../utils/AppError";

export const notFound: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

interface ErrorConStatus {
  status?: number;
  type?: string;
}

function esErrorDuplicado(e: unknown): e is { code: number; keyValue?: Record<string, unknown> } {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === 11000;
}

/** Manejo centralizado de errores: todo error termina aqui con un JSON consistente. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Errores controlados
  if (err instanceof AppError) {
    // `errors` es SIEMPRE una lista de errores por campo ({ campo, mensaje }). Cualquier otro dato
    // (p. ej. el horario con el que choca una cita) va aparte, en `detalles`.
    const extra = err.details === undefined ? {} : Array.isArray(err.details) ? { errors: err.details } : { detalles: err.details };
    return res.status(err.status).json({ message: err.message, ...extra });
  }

  // Validacion de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message }));
    return res.status(400).json({ message: "Datos inválidos", errors });
  }

  // ObjectId mal formado u otro tipo incorrecto
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Valor inválido para "${err.path}"` });
  }

  // Errores al recibir archivos (tamano, campo inesperado...)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "La imagen no puede pesar más de 5 MB" });
    if (err.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ message: "Envía un solo archivo, en el campo «archivo»" });
    return res.status(400).json({ message: "No se pudo recibir el archivo" });
  }

  // Indice unico violado
  if (esErrorDuplicado(err)) {
    const campo = Object.keys(err.keyValue ?? {})[0] ?? "campo";
    return res.status(409).json({ message: `Ya existe un registro con el mismo valor de "${campo}"` });
  }

  // Errores 4xx de Express/body-parser (JSON mal formado, payload muy grande...)
  const http = err as ErrorConStatus;
  if (typeof http.status === "number" && http.status >= 400 && http.status < 500) {
    const message =
      http.type === "entity.parse.failed" ? "El cuerpo de la petición no es un JSON válido"
      : http.type === "entity.too.large" ? "El cuerpo de la petición es demasiado grande"
      : "Petición inválida";
    return res.status(http.status).json({ message });
  }

  // Cualquier otro: 500 sin filtrar detalles internos en produccion
  console.error(err);
  return res.status(500).json({
    message: "Error interno del servidor",
    ...(isProd ? {} : { detalle: err instanceof Error ? err.message : String(err) }),
  });
};
