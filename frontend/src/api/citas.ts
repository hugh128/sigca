import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Cita, Disponibilidad, EstadoCita, Pagina, Profesional } from "@/types/api";

export interface FiltrosCitas {
  desde?: string;
  hasta?: string;
  estado?: EstadoCita[];
  profesionalId?: string;
  pacienteId?: string;
  orden?: "asc" | "desc";
  page?: number;
  limit?: number;
}

function consulta(f: FiltrosCitas): string {
  const p = new URLSearchParams();
  if (f.desde) p.set("desde", f.desde);
  if (f.hasta) p.set("hasta", f.hasta);
  if (f.estado?.length) p.set("estado", f.estado.join(","));
  if (f.profesionalId) p.set("profesionalId", f.profesionalId);
  if (f.pacienteId) p.set("pacienteId", f.pacienteId);
  if (f.orden && f.orden !== "asc") p.set("orden", f.orden);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  if (f.limit) p.set("limit", String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useCitas(filtros: FiltrosCitas, habilitado = true) {
  return useQuery({
    queryKey: ["citas", "lista", filtros],
    queryFn: ({ signal }) => api<Pagina<Cita>>(`/citas${consulta(filtros)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled: habilitado,
  });
}

export function useCita(id: string | undefined) {
  return useQuery({
    queryKey: ["citas", "detalle", id],
    queryFn: ({ signal }) => api<Cita>(`/citas/${id}`, { signal }),
    enabled: Boolean(id),
  });
}

export interface ParamsDisponibilidad {
  profesionalId: string;
  servicioId: string;
  fecha: string;
  excluirCitaId?: string;
}

/** Horarios libres. Nunca se reutiliza una respuesta vieja: la agenda cambia en cualquier momento. */
export function useDisponibilidad(p: Partial<ParamsDisponibilidad>) {
  const listo = Boolean(p.profesionalId && p.servicioId && p.fecha);
  return useQuery({
    queryKey: ["citas", "disponibilidad", p],
    queryFn: ({ signal }) => {
      const q = new URLSearchParams({ profesionalId: p.profesionalId!, servicioId: p.servicioId!, fecha: p.fecha! });
      if (p.excluirCitaId) q.set("excluirCitaId", p.excluirCitaId);
      return api<Disponibilidad>(`/citas/disponibilidad?${q}`, { signal });
    },
    enabled: listo,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useProfesionales(habilitado = true) {
  return useQuery({
    queryKey: ["profesionales"],
    queryFn: ({ signal }) => api<Profesional[]>("/usuarios/profesionales", { signal }),
    staleTime: 5 * 60_000,
    enabled: habilitado,
  });
}

export interface DatosCita {
  pacienteId: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  horaInicio: string;
  observaciones?: string;
}

/** Una cita toca el calendario, el historial de pacientes y la disponibilidad: todo se refresca. */
function useInvalidarCitas() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["citas"] });
}

export function useCrearCita() {
  const invalidar = useInvalidarCitas();
  return useMutation({
    mutationFn: (datos: DatosCita) => api<Cita>("/citas", { method: "POST", body: datos }),
    onSuccess: invalidar,
    // Si el horario se ocupo mientras se llenaba el formulario, la lista de horarios libres ya no es cierta
    onError: invalidar,
  });
}

export function useReprogramarCita() {
  const invalidar = useInvalidarCitas();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & Partial<Pick<DatosCita, "fecha" | "horaInicio" | "profesionalId" | "observaciones">>) =>
      api<Cita>(`/citas/${id}`, { method: "PUT", body: cambios }),
    onSuccess: invalidar,
    onError: invalidar,
  });
}

export function useCambiarEstadoCita() {
  const invalidar = useInvalidarCitas();
  return useMutation({
    mutationFn: ({ id, estado, motivo }: { id: string; estado: EstadoCita; motivo?: string }) =>
      api<Cita>(`/citas/${id}/estado`, { method: "PATCH", body: { estado, motivo } }),
    onSuccess: invalidar,
  });
}
