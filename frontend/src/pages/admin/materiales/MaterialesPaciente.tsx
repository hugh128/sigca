import { useState } from "react";
import { Link, useParams } from "react-router";
import { useAsignaciones, useAsignarMaterial, useMateriales, usePacienteMateriales } from "@/api/materiales";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { claseControl } from "@/components/forms/TextField";
import { ApiError } from "@/lib/api";
import { formatearFechaHora } from "@/lib/format";
import { useDebounce } from "@/lib/useDebounce";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { toast } from "@/store/toast";
function ElegirMaterial({ pacienteId, onCerrar }: { pacienteId: string; onCerrar: () => void }) {
  const [q, setQ] = useState(""); const buscar = useDebounce(q, 250);
  const [page, setPage] = useState(1); const lista = useMateriales(page, buscar, "ACTIVO");
  const asignar = useAsignarMaterial(pacienteId); const [error, setError] = useState("");
  const elegir = async (id: string) => {
    setError("");
    try { await asignar.mutateAsync(id); toast.exito("Material asignado"); onCerrar(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "No se pudo asignar el material"); }
  };
  return <div className="space-y-4">
    <label className="block text-sm font-medium">Buscar material<input type="search" className={claseControl(false, "mt-2")} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {lista.isPending && <Cargando />}{lista.isError && <ErrorCarga error={lista.error} onReintentar={() => lista.refetch()} />}
    {lista.data?.items.length === 0 && <Vacio titulo="No hay materiales activos con esta búsqueda" />}
    {lista.data && <>
      <ul className="divide-y divide-marea-100">{lista.data.items.map(m => <li className="space-y-2 py-4" key={m.id}><h3 className="break-words font-medium">{m.titulo}</h3><p className="text-sm text-ink-soft">{m.tipo}</p><p className="whitespace-pre-wrap break-words text-sm">{m.descripcion}</p><Button disabled={asignar.isPending} aria-label={`Asignar ${m.titulo}`} onClick={() => void elegir(m.id)}>Asignar</Button></li>)}</ul>
      <Paginacion {...lista.data} etiqueta="materiales" singular="material" onCambiar={setPage} />
    </>}
  </div>;
}
export default function MaterialesPaciente() {
  const { id = "" } = useParams(); const p = usePacienteMateriales(id);
  const [page, setPage] = useState(1); const lista = useAsignaciones(id, page);
  const [abierto, setAbierto] = useState(false);
  useDocumentTitle("Materiales del paciente", "SIGCA");
  if (p.isPending) return <Cargando />;
  if (p.isError) return <ErrorCarga error={p.error} onReintentar={() => p.refetch()} />;
  return <div className="mx-auto max-w-4xl">
    <Link to="/admin/materiales" className="rounded text-marea-700 underline">Volver al catálogo</Link>
    <h1 className="mt-4 break-words text-3xl font-semibold text-marea-900">Materiales de {p.data.nombres} {p.data.apellidos}</h1>
    <p className="mt-3 text-ink-soft">Recursos asignados al paciente, con fecha y responsable de la asignación.</p>
    {p.data.estado === "INACTIVO" && <p className="mt-4 rounded-lg bg-sol-100 p-3 text-sm">El paciente está inactivo. Su historial se conserva, pero no puede recibir nuevas asignaciones.</p>}
    <Button className="mt-5" disabled={p.data.estado !== "ACTIVO"} onClick={() => setAbierto(true)}>Asignar material</Button>
    {lista.isPending && <Cargando />}{lista.isError && <ErrorCarga error={lista.error} onReintentar={() => lista.refetch()} />}
    {lista.data?.items.length === 0 && <Vacio titulo="Este paciente todavía no tiene materiales asignados" />}
    {lista.data && lista.data.items.length > 0 && <>
      <ul className="mt-5 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white" aria-label="Materiales asignados">
        {lista.data.items.map(a => <li key={a.id} className="space-y-3 p-5">
          <div className="flex flex-wrap gap-2"><h2 className="break-words text-lg font-medium">{a.material.titulo}</h2><Badge tono={a.material.estado === "ACTIVO" ? "ok" : "neutro"}>{a.material.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Badge></div>
          <p className="text-sm text-ink-soft">{a.material.tipo} · Asignado por {a.asignadoPor.nombre} · {formatearFechaHora(a.createdAt)}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{a.material.descripcion}</p>
          <a className="inline-block rounded text-marea-700 underline" href={a.material.enlace} target="_blank" rel="noopener noreferrer" aria-label={`Abrir recurso: ${a.material.titulo}`}>Abrir recurso</a>
        </li>)}
      </ul><Paginacion {...lista.data} etiqueta="asignaciones" singular="asignación" onCambiar={setPage} />
    </>}
    <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Asignar material" ancho="lg"><ElegirMaterial pacienteId={id} onCerrar={() => setAbierto(false)} /></Modal>
  </div>;
}
