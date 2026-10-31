import { useState } from "react";
import { useSearchParams } from "react-router";
import { useMensajes } from "@/api/contacto";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { formatearFechaHora } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { MensajeContacto } from "@/types/api";

export default function Mensajes() {
  useDocumentTitle("Mensajes", "SIGCA");
  const [params, setParams] = useSearchParams();
  const numero = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(numero) && numero > 0 ? numero : 1;
  const { data, isPending, isFetching, isError, error, refetch } = useMensajes(page);
  const [seleccionado, setSeleccionado] = useState<MensajeContacto | null>(null);

  return (
    <div className="mx-auto max-w-5xl">
      <EncabezadoPagina titulo="Mensajes" descripcion="Consultas recibidas desde el formulario de contacto, de la más reciente a la más antigua." />
      {isPending && <Cargando texto="Cargando mensajes…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}
      {data && data.items.length === 0 && <Vacio titulo="Todavía no hay mensajes">Los mensajes enviados desde Contacto aparecerán aquí.</Vacio>}
      {data && data.items.length > 0 && <>
        <ul className={`mt-8 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white ${isFetching ? "opacity-70" : ""}`} aria-label="Mensajes de contacto">
          {data.items.map(m => <li key={m.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-words font-medium text-marea-900">{m.asunto}</p>
              <p className="mt-1 break-words text-sm text-ink-soft">{m.nombre} · <time dateTime={m.fecha}>{formatearFechaHora(m.fecha)}</time></p>
              <p className="mt-2 line-clamp-2 break-words text-sm text-ink-soft">{m.mensaje}</p>
            </div>
            <Button variante="contorno" className="shrink-0 self-start sm:self-auto" aria-label={`Leer mensaje: ${m.asunto}`} onClick={() => setSeleccionado(m)}>Leer mensaje</Button>
          </li>)}
        </ul>
        <Paginacion page={data.page} pages={data.pages} total={data.total} etiqueta="mensajes" onCambiar={p => setParams(p > 1 ? { page: String(p) } : {})} />
      </>}
      <Modal abierto={seleccionado !== null} onCerrar={() => setSeleccionado(null)} titulo={seleccionado?.asunto ?? "Mensaje"} ancho="lg">
        {seleccionado && <div className="space-y-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-soft">Nombre</dt><dd className="mt-1 break-words font-medium">{seleccionado.nombre}</dd></div>
            <div><dt className="text-ink-soft">Recibido</dt><dd className="mt-1">{formatearFechaHora(seleccionado.fecha)}</dd></div>
            <div><dt className="text-ink-soft">Correo electrónico</dt><dd className="mt-1 break-all"><a className="rounded text-marea-700 underline underline-offset-4" href={`mailto:${seleccionado.correo}`}>{seleccionado.correo}</a></dd></div>
            <div><dt className="text-ink-soft">Teléfono</dt><dd className="mt-1"><a className="rounded text-marea-700 underline underline-offset-4" href={`tel:${seleccionado.telefono.replace(/\s/g, "")}`}>{seleccionado.telefono}</a></dd></div>
          </dl>
          <p className="whitespace-pre-wrap break-words border-t border-marea-100 pt-5 leading-relaxed">{seleccionado.mensaje}</p>
        </div>}
      </Modal>
    </div>
  );
}
