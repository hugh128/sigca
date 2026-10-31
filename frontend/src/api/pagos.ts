import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MetodoPago, Pago, PagoDetalle, Pagina, ResumenPago } from "@/types/api";
export const usePago = (id: string) => useQuery({ queryKey: ["pagos", "detalle", id], queryFn: ({ signal }) => api<PagoDetalle>(`/pagos/${id}`, { signal }), staleTime: 0 });
export const useAnularPago = () => useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => api<PagoDetalle>(`/pagos/${id}/anular`, { method: "PATCH", body: { motivo } }) });
export function usePagos(f: { page: number; citaId?: string; pacienteId?: string; desde?: string; hasta?: string; metodo?: string }) {
  const params = new URLSearchParams({ page: String(f.page), limit: "15" });
  for (const [k, v] of Object.entries(f)) if (v && k !== "page") params.set(k, String(v));
  return useQuery({ queryKey: ["pagos", "lista", f], queryFn: ({ signal }) => api<Pagina<Pago>>(`/pagos?${params}`, { signal }) });
}
export const useResumenPago = (id?: string) => useQuery({ queryKey: ["pagos", "resumen", id], queryFn: ({ signal }) => api<ResumenPago>(`/pagos/citas/${id}/resumen`, { signal }), enabled: Boolean(id), staleTime: 0 });
export const useRegistrarPago = () => useMutation({ mutationFn: (d: { citaId: string; montoCentavos: number; metodo: MetodoPago }) => api<Pago>("/pagos", { method: "POST", body: d }) });
export function useRefrescarPagos() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["pagos"] }), qc.invalidateQueries({ queryKey: ["citas"] }), qc.invalidateQueries({ queryKey: ["cajas"] })]);
}
