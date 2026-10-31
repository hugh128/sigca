import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useCajaActual } from "@/api/cajas";
import { usePagos, useResumenPago } from "@/api/pagos";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Paginacion } from "@/components/ui/Paginacion";
import { formatearFechaHora, formatearFecha, formatearQuetzales } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Pago } from "@/types/api";
import { FormularioPago } from "./FormularioPago";
const METODOS = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta" };
export default function Pagos() {
  useDocumentTitle("Pagos", "SIGCA");
  const [params, setParams] = useSearchParams();
  const citaId = params.get("cita") || undefined, pacienteId = params.get("paciente") || undefined;
  const numero = Number(params.get("page") ?? 1); const page = Number.isSafeInteger(numero) && numero > 0 ? numero : 1;
  const cambiar = (c: Record<string, string>) => setParams(p => { const n = new URLSearchParams(p); n.delete("page"); for (const [k, v] of Object.entries(c)) v ? n.set(k, v) : n.delete(k); return n; });
  const lista = usePagos({ page, citaId, pacienteId, desde: params.get("desde") || undefined, hasta: params.get("hasta") || undefined, metodo: params.get("metodo") || undefined });
  const resumen = useResumenPago(citaId); const caja = useCajaActual(); const [detalle, setDetalle] = useState<Pago>();
  return <div className="mx-auto max-w-5xl">
    <EncabezadoPagina titulo="Pagos" descripcion="Consulta comprobantes y registra pagos o abonos desde la cita correspondiente." />
    <div className="mt-4 flex flex-wrap gap-4"><Link className="rounded text-marea-700 underline" to="/admin/citas">Elegir una cita para cobrar</Link>{(citaId || pacienteId) && <Link className="rounded text-marea-700 underline" to="/admin/pagos">Ver todos los pagos</Link>}</div>
    {citaId && <section className="mt-6 rounded-xl border border-marea-100 bg-white p-5" aria-label="Saldo de la cita">
      {resumen.isPending && <Cargando />}{resumen.isError && <ErrorCarga error={resumen.error} onReintentar={() => resumen.refetch()} />}
      {resumen.data && <>
        <h2 className="break-words text-xl font-semibold">{resumen.data.cita.paciente.nombres} {resumen.data.cita.paciente.apellidos}</h2>
        <p className="mt-2 text-sm">{resumen.data.cita.servicio.nombre} · {formatearFecha(resumen.data.cita.fecha)}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">{[["Costo", resumen.data.costoCentavos], ["Total pagado", resumen.data.totalPagadoCentavos], ["Saldo pendiente", resumen.data.saldoCentavos]].map(([nombre, monto]) => <div key={nombre}><dt className="text-sm text-ink-soft">{nombre}</dt><dd className="text-xl font-semibold">{formatearQuetzales(Number(monto))}</dd></div>)}</dl>
        <p className="mt-3"><Badge tono={resumen.data.estadoFinanciero === "PAGADO" ? "ok" : "aviso"}>{resumen.data.estadoFinanciero === "PAGADO" ? "Pagado" : resumen.data.estadoFinanciero === "PARCIAL" ? "Parcial" : "Pendiente"}</Badge></p>
        {caja.isPending && <Cargando texto="Consultando tu caja…" />}{caja.isError && <ErrorCarga error={caja.error} onReintentar={() => caja.refetch()} />}
        {resumen.data.cita.estado === "CANCELADA" ? <p className="mt-4 text-sm">Esta cita está cancelada y no puede recibir pagos.</p> : resumen.data.saldoCentavos > 0 && <>
          {caja.isSuccess && !caja.data && <p className="mt-4 text-sm">Necesitas una caja propia abierta. <Link className="text-marea-700 underline" to="/admin/caja">Abrir mi caja</Link></p>}
          {caja.data && <FormularioPago key={citaId} citaId={citaId} saldo={resumen.data.saldoCentavos} />}
        </>}
      </>}
    </section>}
    {pacienteId && !citaId && <h2 className="mt-6 text-xl font-semibold">Pagos del paciente</h2>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium">Desde<input className={claseControl(false, "mt-2")} type="date" value={params.get("desde") ?? ""} onChange={e => cambiar({ desde: e.target.value })} /></label>
      <label className="text-sm font-medium">Hasta<input className={claseControl(false, "mt-2")} type="date" value={params.get("hasta") ?? ""} onChange={e => cambiar({ hasta: e.target.value })} /></label>
      <label className="text-sm font-medium">Método<select className={claseControl(false, "mt-2")} value={params.get("metodo") ?? ""} onChange={e => cambiar({ metodo: e.target.value })}><option value="">Todos</option>{Object.entries(METODOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
    </div>
    {lista.isPending && <Cargando />}{lista.isError && <ErrorCarga error={lista.error} onReintentar={() => lista.refetch()} />}
    {lista.data?.items.length === 0 && <Vacio titulo="No hay pagos con estos filtros" />}
    {lista.data && lista.data.items.length > 0 && <>
      <ul className="mt-5 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white" aria-label="Pagos registrados">{lista.data.items.map(p => <li key={p.id} className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{p.comprobante}</p><Badge tono={p.estado === "REGISTRADO" ? "ok" : "neutro"}>{p.estado === "REGISTRADO" ? "Registrado" : "Anulado"}</Badge></div>
        <p className="break-words">{p.paciente.nombres} {p.paciente.apellidos}</p><p className="text-lg font-medium">{formatearQuetzales(p.montoCentavos)} · {METODOS[p.metodo]}</p><p className="text-sm text-ink-soft">{formatearFechaHora(p.fecha)} · {p.registradoPor.nombre}</p>
        <div className="flex flex-wrap items-center gap-4"><Button variante="contorno" onClick={() => setDetalle(p)} aria-label={`Ver comprobante ${p.comprobante}`}>Ver comprobante</Button><Link className="rounded text-sm text-marea-700 underline" to={`/admin/pagos?cita=${p.cita.id}`}>Ver saldo de la cita</Link></div>
      </li>)}</ul><Paginacion {...lista.data} etiqueta="pagos" onCambiar={p => cambiar({ page: String(p) })} />
    </>}
    <Modal abierto={Boolean(detalle)} onCerrar={() => setDetalle(undefined)} titulo="Comprobante interno">
      {detalle && <div className="space-y-3"><p className="font-semibold">{detalle.comprobante}</p><p>{detalle.paciente.nombres} {detalle.paciente.apellidos}</p><p>{formatearQuetzales(detalle.montoCentavos)} · {METODOS[detalle.metodo]}</p><p>{formatearFechaHora(detalle.fecha)}</p><p>Registrado por {detalle.registradoPor.nombre}</p><p>Estado: {detalle.estado === "REGISTRADO" ? "Registrado" : "Anulado"}</p><p className="text-sm text-ink-soft">Comprobante de control interno.</p></div>}
    </Modal>
  </div>;
}
