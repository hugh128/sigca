import type { UsuarioDoc } from "../models/Usuario";

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado (lo asigna el middleware `authenticate`). */
      user?: UsuarioDoc;
    }
  }
}

export {};
