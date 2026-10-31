import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DatosContacto } from "@/schemas/contacto";
import type { MensajeContacto, Pagina } from "@/types/api";

export function useEnviarContacto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosContacto) => api<{ message: string }>("/contacto", { method: "POST", body: datos, auth: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensajes"] }),
  });
}
export function useMensajes(page: number) {
  return useQuery({
    queryKey: ["mensajes", page],
    queryFn: ({ signal }) => api<Pagina<MensajeContacto>>(`/contacto?page=${page}&limit=15`, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
