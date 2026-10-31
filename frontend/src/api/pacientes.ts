import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Pagina, Paciente, Sexo } from "@/types/api";

export interface FiltrosPacientes {
  q?: string;
  estado?: "ACTIVO" | "INACTIVO";
  menores?: boolean;
  page?: number;
  limit?: number;
}

function consulta(f: FiltrosPacientes): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.estado) p.set("estado", f.estado);
  if (f.menores !== undefined) p.set("menores", String(f.menores));
  if (f.page && f.page > 1) p.set("page", String(f.page));
  if (f.limit) p.set("limit", String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function usePacientes(filtros: FiltrosPacientes) {
  return useQuery({
    queryKey: ["pacientes", filtros],
    queryFn: ({ signal }) => api<Pagina<Paciente>>(`/pacientes${consulta(filtros)}`, { signal }),
    placeholderData: keepPreviousData, // al cambiar de pagina o filtro, mantiene la lista anterior mientras carga
  });
}

export function usePaciente(id: string) {
  return useQuery({
    queryKey: ["paciente", id],
    queryFn: ({ signal }) => api<Paciente>(`/pacientes/${id}`, { signal }),
  });
}

export interface DatosPaciente {
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: Sexo;
  telefono: string;
  direccion: string;
  fechaInicio?: string;
  observaciones?: string;
  fotoUrl?: string;
  fotoKey?: string;
}

/** Un paciente se relaciona con responsables, citas y pagos: cualquier cambio refresca todo lo relacionado. */
function useInvalidarPacientes() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["pacientes"] }),
      qc.invalidateQueries({ queryKey: ["paciente"] }),
      qc.invalidateQueries({ queryKey: ["responsables"] }),
    ]);
}

export function useCrearPaciente() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: (datos: DatosPaciente) => api<Paciente>("/pacientes", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useActualizarPaciente() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & Partial<DatosPaciente>) =>
      api<Paciente>(`/pacientes/${id}`, { method: "PUT", body: cambios }),
    onSuccess: invalidar,
  });
}

export function useCambiarEstadoPaciente() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Paciente["estado"] }) =>
      api<Paciente>(`/pacientes/${id}/estado`, { method: "PATCH", body: { estado } }),
    onSuccess: invalidar,
  });
}

export function useAsociarResponsable() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: ({ pacienteId, responsableId }: { pacienteId: string; responsableId: string }) =>
      api<Paciente>(`/pacientes/${pacienteId}/responsables`, { method: "POST", body: { responsableId } }),
    onSuccess: invalidar,
  });
}

export function useDesasociarResponsable() {
  const invalidar = useInvalidarPacientes();
  return useMutation({
    mutationFn: ({ pacienteId, responsableId }: { pacienteId: string; responsableId: string }) =>
      api<Paciente>(`/pacientes/${pacienteId}/responsables/${responsableId}`, { method: "DELETE" }),
    onSuccess: invalidar,
  });
}

/** Pacientes que atiende un profesional (informacion basica, sin telefono ni responsables). */
export function usePacientesBasicos(filtros: { q?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["pacientes", "basicos", filtros],
    queryFn: ({ signal }) => api<Pagina<import("@/types/api").PacienteBasico>>(`/pacientes${consulta(filtros)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}
