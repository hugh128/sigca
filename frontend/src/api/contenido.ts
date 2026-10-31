import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contenido } from "@/types/api";

export type ClaveContenido = keyof Contenido;

/** Contenido editable del portal (nombre del centro, inicio, mision, contacto...). Siempre como visitante. */
export function useContenido() {
  return useQuery({
    queryKey: ["contenido"],
    queryFn: ({ signal }) => api<Contenido>("/contenido", { signal, auth: false }),
    staleTime: 5 * 60_000,
  });
}

/**
 * Version para el editor: siempre vuelve a pedir los datos al abrir la pantalla, para no editar
 * sobre una copia vieja. Quien la use debe esperar a `listo` antes de armar el formulario.
 */
export function useContenidoParaEditar() {
  const q = useQuery({
    queryKey: ["contenido"],
    queryFn: ({ signal }) => api<Contenido>("/contenido", { signal, auth: false }),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const listo = q.data !== undefined && !(q.isFetching && !q.isFetchedAfterMount);
  return { ...q, listo };
}

/** Reemplaza una seccion completa del portal (solo administrador). */
export function useGuardarContenido(clave: ClaveContenido) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: unknown) => api<Contenido[ClaveContenido]>(`/contenido/${clave}`, { method: "PUT", body: datos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contenido"] }),
  });
}
