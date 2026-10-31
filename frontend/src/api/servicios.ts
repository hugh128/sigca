import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Servicio } from "@/types/api";

/** Servicios activos para el portal publico (sin precio). Siempre como visitante. */
export function useServiciosPublicos() {
  return useQuery({
    queryKey: ["servicios", "publico"],
    queryFn: ({ signal }) => api<Servicio[]>("/servicios", { signal, auth: false }),
  });
}

/** Todos los servicios con precio, para el personal autenticado. */
export function useServiciosAdmin(habilitado = true) {
  return useQuery({
    queryKey: ["servicios", "admin"],
    queryFn: ({ signal }) => api<Servicio[]>("/servicios", { signal }),
    enabled: habilitado,
  });
}

export interface DatosServicio {
  nombre: string;
  descripcion: string;
  duracionMin: number;
  /** Centavos enteros (RN-28). */
  precioCentavos: number;
  /** Texto vacio = sin imagen. */
  imagenUrl: string;
  /** Llave del archivo en el almacenamiento (vacia si la imagen es una direccion web externa). */
  imagenKey: string;
}

/** Cualquier cambio en servicios afecta tanto al panel como al portal publico. */
function useInvalidarServicios() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["servicios"] });
}

export function useCrearServicio() {
  const invalidar = useInvalidarServicios();
  return useMutation({
    mutationFn: (datos: DatosServicio) => api<Servicio>("/servicios", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useActualizarServicio() {
  const invalidar = useInvalidarServicios();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & Partial<DatosServicio>) =>
      api<Servicio>(`/servicios/${id}`, { method: "PUT", body: cambios }),
    onSuccess: invalidar,
  });
}

export function useCambiarEstadoServicio() {
  const invalidar = useInvalidarServicios();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Servicio["estado"] }) =>
      api<Servicio>(`/servicios/${id}/estado`, { method: "PATCH", body: { estado } }),
    onSuccess: invalidar,
  });
}
