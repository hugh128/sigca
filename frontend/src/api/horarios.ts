import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Horarios } from "@/types/api";

export function useHorarios() {
  return useQuery({
    queryKey: ["horarios"],
    queryFn: ({ signal }) => api<Horarios>("/horarios", { signal, auth: false }),
    staleTime: 5 * 60_000,
  });
}

/** Igual que `useContenidoParaEditar`: datos frescos antes de armar el formulario. */
export function useHorariosParaEditar() {
  const q = useQuery({
    queryKey: ["horarios"],
    queryFn: ({ signal }) => api<Horarios>("/horarios", { signal, auth: false }),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const listo = q.data !== undefined && !(q.isFetching && !q.isFetchedAfterMount);
  return { ...q, listo };
}

export function useGuardarHorarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: Horarios) => api<Horarios>("/horarios", { method: "PUT", body: datos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["horarios"] }),
  });
}
