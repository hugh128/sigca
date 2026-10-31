import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DatosSolicitud } from "@/schemas/solicitudes";
import type { EstadoSolicitud, Pagina, SolicitudCita } from "@/types/api";
import type { DatosCita } from "./citas";

export function useEnviarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DatosSolicitud) => api<{ message: string }>("/solicitudes-cita", { method: "POST", body: d, auth: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitudes"] }),
  });
}
export function useSolicitudes(page: number, estado?: EstadoSolicitud) {
  return useQuery({
    queryKey: ["solicitudes", "lista", page, estado],
    queryFn: ({ signal }) => api<Pagina<SolicitudCita>>(`/solicitudes-cita?page=${page}&limit=15${estado ? `&estado=${estado}` : ""}`, { signal }),
    placeholderData: keepPreviousData, staleTime: 0,
  });
}
export function useSolicitud(id: string | undefined) {
  return useQuery({ queryKey: ["solicitudes", "detalle", id], queryFn: ({ signal }) => api<SolicitudCita>(`/solicitudes-cita/${id}`, { signal }), enabled: Boolean(id), staleTime: 0 });
}
export function useConvertirSolicitud() {
  const qc = useQueryClient();
  const refrescar = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["solicitudes"] }),
    qc.invalidateQueries({ queryKey: ["citas"] }),
    qc.invalidateQueries({ queryKey: ["pacientes"] }),
  ]);
  return useMutation({
    mutationFn: ({ id, ...d }: { id: string } & Omit<DatosCita, "servicioId">) => api<SolicitudCita>(`/solicitudes-cita/${id}/convertir`, { method: "POST", body: d }),
    onSuccess: refrescar, onError: refrescar,
  });
}
export function useRechazarSolicitud() {
  const qc = useQueryClient();
  const refrescar = () => qc.invalidateQueries({ queryKey: ["solicitudes"] });
  return useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => api<SolicitudCita>(`/solicitudes-cita/${id}/rechazar`, { method: "PATCH", body: { motivo } }), onSuccess: refrescar, onError: refrescar });
}
