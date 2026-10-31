import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Rol } from "../models/Usuario";

export interface TokenPayload {
  sub: string;
  rol: Rol;
  /** Momento de emision (segundos desde epoch). */
  iat?: number;
}

export function firmarToken(payload: Pick<TokenPayload, "sub" | "rol">): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verificarToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !decoded.sub || !("rol" in decoded)) {
    throw new jwt.JsonWebTokenError("Token con formato inválido");
  }
  return { sub: String(decoded.sub), rol: decoded.rol as Rol, iat: decoded.iat };
}
