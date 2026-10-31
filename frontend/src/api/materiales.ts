import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DatosMaterial } from "@/schemas/materiales";
import type { Material, AsignacionMaterial, Pagina, Paciente } from "@/types/api";
export function useMateriales(page: number, q = "", estado = "") {
  return useQuery({ queryKey: ["materiales", "lista", page, q, estado], queryFn: ({ signal }) => api<Pagina<Material>>(`/materiales?page=${page}&limit=15${q ? `&q=${encodeURIComponent(q)}` : ""}${estado ? `&estado=${estado}` : ""}`, { signal }), placeholderData: keepPreviousData });
}
export function useGuardarMaterial() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }: DatosMaterial & { id?: string }) => api<Material>(id ? `/materiales/${id}` : "/materiales", { method: id ? "PUT" : "POST", body: d }), onSuccess: () => qc.invalidateQueries({ queryKey: ["materiales"] }) });
}
export function useEstadoMaterial() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, estado }: Pick<Material, "id" | "estado">) => api<Material>(`/materiales/${id}/estado`, { method: "PATCH", body: { estado } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["materiales"] }) });
}
export function usePacienteMateriales(id: string) {
  return useQuery({ queryKey: ["materiales", "paciente", id], queryFn: ({ signal }) => api<Pick<Paciente, "id" | "nombres" | "apellidos" | "estado">>(`/pacientes/${id}`, { signal }) });
}
export function useAsignaciones(id: string, page: number) {
  return useQuery({ queryKey: ["materiales", "asignaciones", id, page], queryFn: ({ signal }) => api<Pagina<AsignacionMaterial>>(`/materiales/pacientes/${id}?page=${page}&limit=15`, { signal }) });
}
export function useAsignarMaterial(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (materialId: string) => api<AsignacionMaterial>(`/materiales/pacientes/${id}`, { method: "POST", body: { materialId } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["materiales", "asignaciones", id] }) });
}
