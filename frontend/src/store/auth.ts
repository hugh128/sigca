import { create } from "zustand";
import type { Usuario } from "@/types/api";

const TOKEN_KEY = "sigca.token";

function leerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible: la sesion dura solo mientras la pestana este abierta */
  }
}

/**
 * - inicial: hay un token guardado y aun no se ha comprobado con el servidor
 * - cargando: comprobando el token (GET /auth/me)
 * - autenticado / anonimo: estado final
 */
export type EstadoSesion = "inicial" | "cargando" | "autenticado" | "anonimo";

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  estado: EstadoSesion;
  /** Motivo por el que se cerro la sesion sin que el usuario lo pidiera (token vencido, usuario desactivado...). */
  sesionExpirada: boolean;
  iniciarSesion: (token: string, usuario: Usuario) => void;
  marcarCargando: () => void;
  restaurarUsuario: (usuario: Usuario) => void;
  marcarAnonimo: () => void;
  cerrarSesion: () => void;
  expirarSesion: () => void;
}

const tokenInicial = leerToken();

export const useAuthStore = create<AuthState>((set) => ({
  token: tokenInicial,
  usuario: null,
  estado: tokenInicial ? "inicial" : "anonimo",
  sesionExpirada: false,

  iniciarSesion: (token, usuario) => {
    guardarToken(token);
    set({ token, usuario, estado: "autenticado", sesionExpirada: false });
  },
  marcarCargando: () => set({ estado: "cargando" }),
  restaurarUsuario: (usuario) => set({ usuario, estado: "autenticado" }),
  /** No se pudo verificar la sesion (p. ej. sin conexion): se trata como visitante pero se conserva el token. */
  marcarAnonimo: () => set({ usuario: null, estado: "anonimo" }),
  cerrarSesion: () => {
    guardarToken(null);
    set({ token: null, usuario: null, estado: "anonimo", sesionExpirada: false });
  },
  expirarSesion: () => {
    guardarToken(null);
    set({ token: null, usuario: null, estado: "anonimo", sesionExpirada: true });
  },
}));
