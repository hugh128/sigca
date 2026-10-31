import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const opcionesBase = { standardHeaders: "draft-8" as const, legacyHeaders: false };

/** Limite general para toda la API. */
export const limiteGeneral = rateLimit({
  ...opcionesBase,
  windowMs: 15 * 60 * 1000,
  limit: env.RATE_LIMIT_GENERAL,
  message: { message: "Demasiadas peticiones, intenta de nuevo más tarde" },
});

/** Limite estricto para el login (fuerza bruta). Solo cuenta los intentos fallidos. */
export const limiteLogin = rateLimit({
  ...opcionesBase,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: "Demasiados intentos de inicio de sesión, intenta de nuevo en unos minutos" },
});

/** Para formularios publicos (contacto, solicitudes de cita). Se usara en etapas posteriores. */
export const limiteFormularioPublico = rateLimit({
  ...opcionesBase,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { message: "Has enviado demasiadas solicitudes, intenta de nuevo más tarde" },
});

/** Subidas de imagenes (procesarlas consume CPU). */
export const limiteSubidas = rateLimit({
  ...opcionesBase,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { message: "Has subido muchas imágenes en poco tiempo, intenta de nuevo en unos minutos" },
});
