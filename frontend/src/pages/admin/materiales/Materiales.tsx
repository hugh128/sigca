import { useState } from "react";
import { Link } from "react-router";
import { useEstadoMaterial, useMateriales } from "@/api/materiales";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { ApiError } from "@/lib/api";
import { formatearFechaHora } from "@/lib/format";
import { useDebounce } from "@/lib/useDebounce";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Material } from "@/types/api";
import { FormularioMaterial } from "./FormularioMaterial";
export default function Materiales() {
  useDocumentTitle("Materiales", "SIGCA");
  const admin = useAuthStore(s => s.usuario?.rol === "ADMINISTRADOR");
  const [q, setQ] = useState(""); const buscar = useDebounce(q, 250);
  const [estado, setEstado] = useState(""); const [page, setPage] = useState(1);
  const lista = useMateriales(page, buscar, estado); const cambiar = useEstadoMaterial();
  const [editar, setEditar] = useState<Material | "nuevo">();
  const alternar = async (m: Material) => {
    try { await cambiar.mutateAsync({ id: m.id, estado: m.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" }); toast.exito("Estado del material actualizado"); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "No se pudo cambiar el estado"); }
  };
  return <div className="mx-auto max-w-5xl">
    <EncabezadoPagina titulo="Materiales" descripcion="Recursos educativos y de apoyo para asignar a pacientes." />
    <div className="mt-5 flex flex-wrap gap-3">
      {admin && <Button onClick={() => setEditar("nuevo")}>Nuevo material</Button>}
      <Link className="rounded-lg px-3 py-2 text-marea-700 underline" to={admin ? "/admin/pacientes" : "/admin/mis-pacientes"}>Elegir un paciente para asignar</Link>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Buscar por título<input className={claseControl(false, "mt-2")} type="search" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label>
      {admin && <label className="text-sm font-medium">Estado<select className={claseControl(false, "mt-2")} value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }}><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>}
    </div>
    {lista.isPending && <Cargando />}{lista.isError && <ErrorCarga error={lista.error} onReintentar={() => lista.refetch()} />}
    {lista.data?.items.length === 0 && <Vacio titulo="No hay materiales con estos filtros" />}
    {lista.data && lista.data.items.length > 0 && <>
      <ul className="mt-5 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white" aria-label="Catálogo de materiales">
        {lista.data.items.map(m => <li key={m.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-lg font-semibold">{m.titulo}</h2><Badge tono={m.estado === "ACTIVO" ? "ok" : "neutro"}>{m.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Badge></div>
          <p className="text-sm text-ink-soft">{m.tipo} · Registrado {formatearFechaHora(m.createdAt)}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{m.descripcion}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={m.enlace} target="_blank" rel="noopener noreferrer" className="rounded text-marea-700 underline" aria-label={`Abrir recurso: ${m.titulo}`}>Abrir recurso</a>
            {admin && <><Button variante="texto" onClick={() => setEditar(m)} aria-label={`Editar ${m.titulo}`}>Editar</Button><Button variante="texto" disabled={cambiar.isPending} onClick={() => void alternar(m)} aria-label={`${m.estado === "ACTIVO" ? "Desactivar" : "Activar"} ${m.titulo}`}>{m.estado === "ACTIVO" ? "Desactivar" : "Activar"}</Button></>}
          </div>
        </li>)}
      </ul>
      <Paginacion {...lista.data} etiqueta="materiales" singular="material" onCambiar={setPage} />
    </>}
    <Modal abierto={Boolean(editar)} onCerrar={() => setEditar(undefined)} titulo={editar === "nuevo" ? "Nuevo material" : "Editar material"}>
      <FormularioMaterial material={editar === "nuevo" ? undefined : editar} onCerrar={() => setEditar(undefined)} />
    </Modal>
  </div>;
}
