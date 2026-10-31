import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { RespuestaLogin, Usuario } from "@/types/api";

export async function login(email: string, password: string): Promise<Usuario> {
  // auth: false -> aunque haya un token viejo guardado, el login va como visitante.
  const r = await api<RespuestaLogin>("/auth/login", { method: "POST", body: { email, password }, auth: false });
  useAuthStore.getState().iniciarSesion(r.token, r.usuario);
  return r.usuario;
}

/** Comprueba con el servidor el token guardado (al abrir la aplicacion). */
export async function restaurarSesion(): Promise<void> {
  const store = useAuthStore.getState();
  if (store.estado !== "inicial") return;
  store.marcarCargando();
  try {
    const r = await api<{ usuario: Usuario }>("/auth/me");
    useAuthStore.getState().restaurarUsuario(r.usuario);
  } catch {
    // 401: `api` ya cerro la sesion. Otros errores (sin conexion): se sigue como visitante.
    if (useAuthStore.getState().estado === "cargando") useAuthStore.getState().marcarAnonimo();
  }
}
