import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Pagina, Responsable } from "@/types/api";

export interface FiltrosResponsables {
  q?: string;
  page?: number;
  limit?: number;
}

function consulta(f: FiltrosResponsables): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  if (f.limit) p.set("limit", String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useResponsables(filtros: FiltrosResponsables, habilitado = true) {
  return useQuery({
    queryKey: ["responsables", filtros],
    queryFn: ({ signal }) => api<Pagina<Responsable>>(`/responsables${consulta(filtros)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled: habilitado,
  });
}

export interface DatosResponsable {
  nombres: string;
  apellidos: string;
  parentesco: string;
  telefono: string;
  email: string;
  direccion: string;
  fotoUrl?: string;
  fotoKey?: string;
}

function useInvalidar() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["responsables"] }),
      qc.invalidateQueries({ queryKey: ["pacientes"] }),
      qc.invalidateQueries({ queryKey: ["paciente"] }),
    ]);
}

/** `pacientes`: ids de pacientes a los que se asocia al crearlo. */
export function useCrearResponsable() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (datos: DatosResponsable & { pacientes?: string[] }) => api<Responsable>("/responsables", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useActualizarResponsable() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & Partial<DatosResponsable>) =>
      api<Responsable>(`/responsables/${id}`, { method: "PUT", body: cambios }),
    onSuccess: invalidar,
  });
}

export function useAsociarPaciente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ responsableId, pacienteId }: { responsableId: string; pacienteId: string }) =>
      api<Responsable>(`/responsables/${responsableId}/pacientes`, { method: "POST", body: { pacienteId } }),
    onSuccess: invalidar,
  });
}

export function useDesasociarPaciente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ responsableId, pacienteId }: { responsableId: string; pacienteId: string }) =>
      api<Responsable>(`/responsables/${responsableId}/pacientes/${pacienteId}`, { method: "DELETE" }),
    onSuccess: invalidar,
  });
}
