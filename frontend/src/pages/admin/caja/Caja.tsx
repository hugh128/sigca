import { useState } from "react";
import { useCajaActual, useCajas } from "@/api/cajas";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Paginacion } from "@/components/ui/Paginacion";
import { formatearFechaHora, formatearQuetzales } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useAuthStore } from "@/store/auth";
import { FormularioApertura } from "./FormularioApertura";
import { DatosCaja, ResumenCaja } from "./DatosCaja";
import { DetalleCaja } from "./DetalleCaja";
export default function Caja() {
  useDocumentTitle("Caja diaria", "SIGCA");
  const usuario = useAuthStore(s => s.usuario); const admin = usuario?.rol === "ADMINISTRADOR";
  const actual = useCajaActual(); const [page, setPage] = useState(1); const [estado, setEstado] = useState(""); const [propias, setPropias] = useState(false);
  const lista = useCajas(page, estado, admin && propias ? usuario?.id : undefined);
  const [id, setId] = useState<string>();
  return <div className="mx-auto max-w-5xl">
    <EncabezadoPagina titulo="Caja diaria" descripcion="Consulta ingresos, revisa movimientos y realiza el cierre de tu caja." />
    {actual.isPending && <Cargando texto="Consultando tu caja…" />}
    {actual.isError && <ErrorCarga error={actual.error} onReintentar={() => actual.refetch()} />}
    {actual.data && <section className="mt-5 rounded-xl border border-marea-100 bg-white p-5"><h2 className="text-xl font-semibold">Mi caja abierta</h2><DatosCaja caja={actual.data} />{actual.data.resumen && <ResumenCaja resumen={actual.data.resumen} />}<Button className="mt-5" onClick={() => setId(actual.data!.id)}>Movimientos y cierre</Button></section>}
    {actual.isSuccess && actual.data === null && <FormularioApertura />}
    <section className="mt-8" aria-labelledby="listado-cajas">
      <h2 id="listado-cajas" className="text-xl font-semibold">{admin ? "Todas las cajas" : "Mis cajas"}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <label className="w-full text-sm font-medium sm:w-60">Estado<select className={claseControl(false, "mt-2")} value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }}><option value="">Todos</option><option value="ABIERTA">Abierta</option><option value="CERRADA">Cerrada</option></select></label>
        {admin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={propias} onChange={e => { setPropias(e.target.checked); setPage(1); }} />Mostrar solo mis cajas</label>}
      </div>
      {lista.isPending && <Cargando />}{lista.isError && <ErrorCarga error={lista.error} onReintentar={() => lista.refetch()} />}
      {lista.data?.items.length === 0 && <Vacio titulo="No hay cajas con estos filtros" />}
      {lista.data && lista.data.items.length > 0 && <>
        <ul className="mt-5 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white" aria-label="Cajas registradas">
          {lista.data.items.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0 space-y-2"><p className="break-words font-medium">{c.usuario.nombre}</p><p className="text-sm text-ink-soft">Abierta {formatearFechaHora(c.apertura)}</p><p className="text-sm">Inicial: {formatearQuetzales(c.montoInicialCentavos)}</p><Badge tono={c.estado === "ABIERTA" ? "ok" : "neutro"}>{c.estado === "ABIERTA" ? "Abierta" : "Cerrada"}</Badge></div>
            <Button variante="contorno" aria-label={`Ver caja de ${c.usuario.nombre}`} onClick={() => setId(c.id)}>Ver detalle</Button>
          </li>)}
        </ul><Paginacion {...lista.data} etiqueta="cajas" onCambiar={setPage} />
      </>}
    </section>
    {id && <DetalleCaja id={id} onCerrar={() => setId(undefined)} />}
  </div>;
}
