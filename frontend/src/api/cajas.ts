import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Caja, Pagina } from "@/types/api";
export const useCajaActual = () => useQuery({ queryKey: ["cajas", "actual"], queryFn: ({ signal }) => api<Caja | null>("/cajas/actual", { signal }), staleTime: 0 });
export function useCajas(page: number, estado: string, usuarioId?: string) {
  return useQuery({ queryKey: ["cajas", "lista", page, estado, usuarioId], queryFn: ({ signal }) => api<Pagina<Caja>>(`/cajas?page=${page}&limit=15${estado ? `&estado=${estado}` : ""}${usuarioId ? `&usuarioId=${usuarioId}` : ""}`, { signal }) });
}
export const useCaja = (id?: string) => useQuery({ queryKey: ["cajas", "detalle", id], queryFn: ({ signal }) => api<Caja>(`/cajas/${id}`, { signal }), enabled: Boolean(id), staleTime: 0 });
export const useAbrirCaja = () => useMutation({ mutationFn: (montoInicialCentavos: number) => api<Caja>("/cajas/abrir", { method: "POST", body: { montoInicialCentavos } }) });
export function useRefrescarCajas() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["cajas"] });
}
