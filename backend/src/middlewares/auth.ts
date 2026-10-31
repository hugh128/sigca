import type { Request, RequestHandler } from "express";
import { Usuario, type Rol } from "../models/Usuario";
import { AppError } from "../utils/AppError";
import { verificarToken } from "../utils/jwt";

/** Extrae el token del encabezado `Authorization: Bearer <token>`. */
function extraerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [esquema, token] = header.split(" ");
  return esquema === "Bearer" && token ? token : null;
}

async function cargarUsuario(token: string, req: Request): Promise<void> {
  let payload;
  try {
    payload = verificarToken(token);
  } catch {
    throw AppError.unauthorized("Sesión inválida o expirada");
  }

  // Se consulta la BD en cada peticion para que un usuario desactivado
  // pierda acceso de inmediato (RN-08), aunque su token no haya expirado.
  const usuario = await Usuario.findById(payload.sub).select("+passwordChangedAt");
  if (!usuario || !usuario.activo) throw AppError.unauthorized("Sesión inválida o usuario inactivo");

  // Tokens emitidos antes de un restablecimiento de contrasena ya no sirven.
  if (usuario.passwordChangedAt && payload.iat && payload.iat * 1000 < usuario.passwordChangedAt.getTime()) {
    throw AppError.unauthorized("La sesión ya no es válida, inicia sesión nuevamente");
  }

  req.user = usuario;
}

/** Exige un token valido y un usuario activo. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = extraerToken(req);
  if (!token) return next(AppError.unauthorized("Debes iniciar sesión"));
  try {
    await cargarUsuario(token, req);
    next();
  } catch (e) {
    next(e);
  }
};

/** Para rutas publicas que muestran mas informacion si hay sesion. Si no hay token, continua. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = extraerToken(req);
  if (!token) return next();
  try {
    await cargarUsuario(token, req);
    next();
  } catch (e) {
    next(e);
  }
};

/** Autorizacion por rol. Debe ir DESPUES de `authenticate`. */
export const authorize =
  (...roles: Rol[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized("Debes iniciar sesión"));
    if (!roles.includes(req.user.rol)) return next(AppError.forbidden());
    next();
  };
