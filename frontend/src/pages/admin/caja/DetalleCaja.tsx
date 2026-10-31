import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { useCaja, useMovimientosCaja, useRefrescarCajas } from "@/api/cajas";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { formatearFechaHora, formatearQuetzales } from "@/lib/format";
import type { CajaDetalle } from "@/types/api";
import { DatosCaja, ResumenCaja } from "./DatosCaja";
import { FormularioCierre } from "./FormularioCierre";
export function DetalleCaja({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const consulta = useCaja(id); const c = consulta.isFetchedAfterMount && !consulta.isError ? consulta.data : undefined;
  const [page, setPage] = useState(1); const movimientos = useMovimientosCaja(id, page);
  const [cerrando, setCerrando] = useState(false); const qc = useQueryClient(); const refrescar = useRefrescarCajas();
  const cerrada = (caja: CajaDetalle) => { qc.setQueryData(["cajas", "detalle", id], caja); setCerrando(false); void refrescar(); };
  return <Modal abierto onCerrar={onCerrar} titulo="Detalle de caja" ancho="lg">
    {!consulta.isFetchedAfterMount && !consulta.isError && <Cargando texto="Consultando caja…" />}{consulta.isError && <ErrorCarga error={consulta.error} onReintentar={() => consulta.refetch()} />}
    {c && <>
      <DatosCaja caja={c} /><ResumenCaja resumen={c.resumen} />
      {c.puedeCerrar && (cerrando ? <FormularioCierre caja={c} onCerrada={cerrada} onVolver={() => setCerrando(false)} /> : <Button className="mt-5" onClick={() => setCerrando(true)}>Cerrar esta caja</Button>)}
      <section className="mt-7" aria-labelledby="movimientos-caja"><h3 id="movimientos-caja" className="text-lg font-semibold">Movimientos</h3><p className="mt-2 text-sm text-ink-soft">Los pagos anulados se conservan en el historial y se excluyen de los ingresos.</p>
        {movimientos.isPending && <Cargando />}{movimientos.isError && <ErrorCarga error={movimientos.error} onReintentar={() => movimientos.refetch()} />}
        {movimientos.data?.items.length === 0 && <Vacio titulo="Esta caja no tiene movimientos" />}
        {movimientos.data && movimientos.data.items.length > 0 && <>
          <ul className="mt-4 divide-y divide-marea-100" aria-label="Movimientos de caja">{movimientos.data.items.map(p => <li key={p.id} className="space-y-2 py-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{p.comprobante}</p><Badge tono={p.estado === "REGISTRADO" ? "ok" : "neutro"}>{p.estado === "REGISTRADO" ? "Registrado" : "Anulado"}</Badge></div>
            <p className="break-words">{p.paciente.nombres} {p.paciente.apellidos}</p><p>{formatearQuetzales(p.montoCentavos)} · {{ EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta" }[p.metodo]}</p><p>{formatearFechaHora(p.fecha)} · {p.registradoPor.nombre}</p>
            {p.motivoAnulacion && <p className="whitespace-pre-wrap break-words">Anulación: {p.motivoAnulacion}{p.anuladoPor && ` · ${p.anuladoPor.nombre}`}</p>}
            <Link to={`/admin/pagos?cita=${p.cita.id}`} onClick={onCerrar} className="inline-block rounded text-marea-700 underline">Ver cita y comprobantes</Link>
          </li>)}</ul><Paginacion {...movimientos.data} etiqueta="movimientos" onCambiar={setPage} />
        </>}
      </section>
    </>}
  </Modal>;
}
