import { Badge } from "@/components/ui/Badge";
import { formatearFechaHora, formatearQuetzales } from "@/lib/format";
import type { Caja, TotalesCaja } from "@/types/api";
export function textoDiferencia(diferencia: number) {
  return diferencia === 0 ? "Sin diferencia" : `${diferencia < 0 ? "Faltante" : "Sobrante"} de ${formatearQuetzales(Math.abs(diferencia))}`;
}
export function DatosCaja({ caja }: { caja: Caja }) {
  return <>
    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="text-ink-soft">Responsable</dt><dd className="break-words font-medium">{caja.usuario.nombre}</dd></div>
      <div><dt className="text-ink-soft">Apertura</dt><dd>{formatearFechaHora(caja.apertura)}</dd></div>
      <div><dt className="text-ink-soft">Monto inicial de efectivo</dt><dd className="text-xl font-semibold">{formatearQuetzales(caja.montoInicialCentavos)}</dd></div>
      <div><dt className="text-ink-soft">Estado</dt><dd><Badge tono={caja.estado === "ABIERTA" ? "ok" : "neutro"}>{caja.estado === "ABIERTA" ? "Abierta" : "Cerrada"}</Badge></dd></div>
    </dl>
    {caja.estado === "CERRADA" && <section className="mt-5 space-y-2 rounded-lg bg-marea-50 p-4" aria-label="Auditoría de cierre">
      {caja.cerradoPor && <p className="text-sm">Cerrada por {caja.cerradoPor.nombre}</p>}{caja.cierre && <p className="text-sm">{formatearFechaHora(caja.cierre)}</p>}
      {caja.efectivoContadoCentavos !== undefined && <p>Efectivo contado: {formatearQuetzales(caja.efectivoContadoCentavos)}</p>}
      {caja.diferenciaCentavos !== undefined && <p className="font-semibold">{textoDiferencia(caja.diferenciaCentavos)}</p>}
    </section>}
  </>;
}
export function ResumenCaja({ resumen }: { resumen: TotalesCaja }) {
  const valores = [["Pagos en efectivo", resumen.totalEfectivoCentavos], ["Transferencias", resumen.totalTransferenciaCentavos], ["Tarjeta", resumen.totalTarjetaCentavos], ["Total de ingresos", resumen.totalIngresosCentavos], ["Efectivo esperado", resumen.efectivoEsperadoCentavos]] as const;
  return <dl className="mt-5 grid gap-4 border-t border-marea-100 pt-5 text-sm sm:grid-cols-2">{valores.map(([etiqueta, monto]) => <div key={etiqueta}><dt className="text-ink-soft">{etiqueta}</dt><dd className="text-lg font-semibold">{formatearQuetzales(monto)}</dd></div>)}</dl>;
}
