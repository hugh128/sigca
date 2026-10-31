import { useState } from "react";
import { useSearchParams } from "react-router";
import { useRechazarSolicitud, useSolicitud, useSolicitudes } from "@/api/solicitudes";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { ApiError } from "@/lib/api";
import { formatearFecha, formatearFechaHora } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { toast } from "@/store/toast";
import type { EstadoSolicitud } from "@/types/api";
import { DetalleCita } from "./citas/DetalleCita";
import { FormularioCita } from "./citas/FormularioCita";

const ETIQUETAS: Record<EstadoSolicitud, string> = { PENDIENTE: "Pendiente", ATENDIDA: "Atendida", RECHAZADA: "Rechazada" };
const ESTADOS = Object.keys(ETIQUETAS) as EstadoSolicitud[];

export default function Solicitudes() {
  useDocumentTitle("Solicitudes de cita", "SIGCA");
  const [params, setParams] = useSearchParams();
  const filtro = params.get("estado") ?? "PENDIENTE";
  const estado = ESTADOS.includes(filtro as EstadoSolicitud) ? filtro as EstadoSolicitud : undefined;
  const numero = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(numero) && numero > 0 ? numero : 1;
  const lista = useSolicitudes(page, estado);
  const [id, setId] = useState<string>();
  const [vista, setVista] = useState<"detalle" | "convertir" | "rechazar">("detalle");
  const detalle = useSolicitud(id);
  const solicitud = detalle.data;
  const rechazar = useRechazarSolicitud();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [citaId, setCitaId] = useState<string>();
  const cerrar = () => setId(undefined);
  const abrir = (solicitudId: string) => { setVista("detalle"); setMotivo(""); setError(""); setId(solicitudId); };
  const descartar = async () => {
    if (!id) return;
    setError("");
    try { await rechazar.mutateAsync({ id, motivo }); toast.exito("Solicitud rechazada"); setVista("detalle"); }
    catch (e) { setError(e instanceof ApiError ? e.message : "No pudimos rechazar la solicitud"); }
  };

  return <div className="mx-auto max-w-5xl">
    <EncabezadoPagina titulo="Solicitudes de cita" descripcion="Coordina la atención con el solicitante antes de programar. Las solicitudes no reservan horarios." />
    <label className="mt-6 block max-w-xs text-sm font-medium">Estado
      <select className={claseControl(false, "mt-2")} value={estado ?? "TODAS"} onChange={e => setParams({ estado: e.target.value })}>
        {ESTADOS.map(e => <option key={e} value={e}>{ETIQUETAS[e]}</option>)}<option value="TODAS">Todas</option>
      </select>
    </label>
    {lista.isPending && <Cargando texto="Cargando solicitudes…" />}
    {lista.isError && <ErrorCarga error={lista.error} onReintentar={() => lista.refetch()} />}
    {lista.data?.items.length === 0 && <Vacio titulo="No hay solicitudes con este estado">Las nuevas solicitudes aparecerán aquí.</Vacio>}
    {lista.data && lista.data.items.length > 0 && <>
      <ul className={`mt-6 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white ${lista.isFetching ? "opacity-70" : ""}`} aria-label="Solicitudes de cita">
        {lista.data.items.map(s => <li key={s.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="break-words font-medium text-marea-900">{s.nombre}</p>
            <p className="break-words text-sm">{s.servicio.nombre} · Prefiere {formatearFecha(s.fechaPreferida)}</p>
            <p className="text-sm text-ink-soft">Recibida {formatearFechaHora(s.createdAt)}</p>
            <Badge tono={s.estado === "PENDIENTE" ? "aviso" : s.estado === "ATENDIDA" ? "ok" : "neutro"}>{ETIQUETAS[s.estado]}</Badge>
          </div>
          <Button variante="contorno" className="shrink-0 self-start" aria-label={`Revisar solicitud de ${s.nombre}`} onClick={() => abrir(s.id)}>Revisar solicitud</Button>
        </li>)}
      </ul>
      <Paginacion {...lista.data} etiqueta="solicitudes" onCambiar={p => setParams({ estado: filtro, page: String(p) })} />
    </>}

    <Modal abierto={Boolean(id)} onCerrar={cerrar} titulo={vista === "convertir" ? "Convertir solicitud en cita" : vista === "rechazar" ? "Rechazar solicitud" : "Solicitud de cita"} ancho="lg">
      {detalle.isPending && <Cargando />}
      {detalle.isError && <ErrorCarga error={detalle.error} onReintentar={() => detalle.refetch()} />}
      {solicitud && vista === "convertir" && <FormularioCita solicitud={solicitud} onCerrar={cerrar} onConvertida={s => setCitaId(s.cita?.id)} />}
      {solicitud && vista === "rechazar" && <form className="space-y-5" onSubmit={e => { e.preventDefault(); void descartar(); }}>
        <p>Se rechazará la solicitud de <strong>{solicitud.nombre}</strong>. Esta acción no programa ni cancela citas.</p>
        <label className="block text-sm font-medium">Motivo (opcional)<textarea className={claseControl(false, "mt-2")} maxLength={300} rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3"><Button variante="texto" onClick={() => setVista("detalle")}>Volver</Button><Button type="submit" disabled={rechazar.isPending}>{rechazar.isPending ? "Guardando…" : "Rechazar solicitud"}</Button></div>
      </form>}
      {solicitud && vista === "detalle" && <div className="space-y-6">
        <Badge tono={solicitud.estado === "PENDIENTE" ? "aviso" : solicitud.estado === "ATENDIDA" ? "ok" : "neutro"}>{ETIQUETAS[solicitud.estado]}</Badge>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-soft">Solicitante</dt><dd className="mt-1 break-words font-medium">{solicitud.nombre}</dd></div>
          <div><dt className="text-ink-soft">Servicio</dt><dd className="mt-1 break-words">{solicitud.servicio.nombre}</dd></div>
          <div><dt className="text-ink-soft">Correo electrónico</dt><dd className="mt-1 break-all"><a className="text-marea-700 underline" href={`mailto:${solicitud.correo}`}>{solicitud.correo}</a></dd></div>
          <div><dt className="text-ink-soft">Teléfono</dt><dd className="mt-1"><a className="text-marea-700 underline" href={`tel:${solicitud.telefono.replace(/\s/g, "")}`}>{solicitud.telefono}</a></dd></div>
          <div><dt className="text-ink-soft">Fecha preferida</dt><dd className="mt-1">{formatearFecha(solicitud.fechaPreferida)}</dd></div>
          {solicitud.fechaGestion && <div><dt className="text-ink-soft">Gestionada</dt><dd className="mt-1">{formatearFechaHora(solicitud.fechaGestion)} · {solicitud.gestionadoPor?.nombre}</dd></div>}
        </dl>
        {solicitud.mensaje && <p className="whitespace-pre-wrap break-words border-t border-marea-100 pt-4 text-sm">{solicitud.mensaje}</p>}
        {solicitud.motivoRechazo && <p className="whitespace-pre-wrap break-words text-sm">Motivo: {solicitud.motivoRechazo}</p>}
        {solicitud.cita && <Button onClick={() => { setCitaId(solicitud.cita!.id); cerrar(); }}>Ver cita generada</Button>}
        {solicitud.estado === "PENDIENTE" && <>
          {solicitud.servicio.estado !== "ACTIVO" && <p role="alert" className="text-sm text-danger">El servicio está inactivo; no se puede convertir esta solicitud en una cita.</p>}
          <div className="flex flex-wrap justify-end gap-3"><Button variante="texto" onClick={() => setVista("rechazar")}>Rechazar solicitud</Button><Button disabled={solicitud.servicio.estado !== "ACTIVO"} onClick={() => setVista("convertir")}>Convertir en cita</Button></div>
        </>}
      </div>}
    </Modal>
    {citaId && <DetalleCita citaId={citaId} onCerrar={() => setCitaId(undefined)} />}
  </div>;
}
