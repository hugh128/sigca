import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Rol, Usuario } from "@/types/api";

/** `enabled` permite pedirlo solo cuando el rol tiene permiso (la API responde 403 a los demas). */
export function useUsuarios(enabled = true) {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: ({ signal }) => api<Usuario[]>("/usuarios", { signal }),
    enabled,
  });
}

export interface DatosUsuario {
  nombre: string;
  email: string;
  rol: Rol;
}

function useInvalidarUsuarios() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["usuarios"] });
}

export function useCrearUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (datos: DatosUsuario & { password: string }) => api<Usuario>("/usuarios", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useActualizarUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & Partial<DatosUsuario>) =>
      api<Usuario>(`/usuarios/${id}`, { method: "PUT", body: cambios }),
    onSuccess: invalidar,
  });
}

export function useCambiarEstadoUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api<Usuario>(`/usuarios/${id}/estado`, { method: "PATCH", body: { activo } }),
    onSuccess: invalidar,
  });
}

export function useRestablecerPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api<{ message: string }>(`/usuarios/${id}/password`, { method: "PATCH", body: { password } }),
  });
}
