import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Caja, CajaDetalle, Pago, Pagina } from "@/types/api";
export const useCajaActual = () => useQuery({ queryKey: ["cajas", "actual"], queryFn: ({ signal }) => api<CajaDetalle | null>("/cajas/actual", { signal }), staleTime: 0 });
export function useCajas(page: number, estado: string, usuarioId?: string) {
  return useQuery({ queryKey: ["cajas", "lista", page, estado, usuarioId], queryFn: ({ signal }) => api<Pagina<Caja>>(`/cajas?page=${page}&limit=15${estado ? `&estado=${estado}` : ""}${usuarioId ? `&usuarioId=${usuarioId}` : ""}`, { signal }) });
}
export const useCaja = (id?: string) => useQuery({ queryKey: ["cajas", "detalle", id], queryFn: ({ signal }) => api<CajaDetalle>(`/cajas/${id}`, { signal }), enabled: Boolean(id), staleTime: 0 });
export const useMovimientosCaja = (id: string, page: number) => useQuery({ queryKey: ["cajas", "movimientos", id, page], queryFn: ({ signal }) => api<Pagina<Pago>>(`/cajas/${id}/movimientos?page=${page}&limit=10`, { signal }) });
export const useCerrarCaja = () => useMutation({ mutationFn: ({ id, efectivoContadoCentavos }: { id: string; efectivoContadoCentavos: number }) => api<CajaDetalle>(`/cajas/${id}/cerrar`, { method: "POST", body: { efectivoContadoCentavos } }) });
export const useAbrirCaja = () => useMutation({ mutationFn: (montoInicialCentavos: number) => api<Caja>("/cajas/abrir", { method: "POST", body: { montoInicialCentavos } }) });
export function useRefrescarCajas() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["cajas"] }), qc.invalidateQueries({ queryKey: ["pagos"] })]);
}
