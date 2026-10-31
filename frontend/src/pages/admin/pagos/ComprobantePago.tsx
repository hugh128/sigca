import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { useAnularPago, usePago, useRefrescarPagos } from "@/api/pagos";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { formatearFechaHora, formatearQuetzales } from "@/lib/format";
import { toast } from "@/store/toast";
import type { PagoDetalle } from "@/types/api";
const schema = z.object({ motivo: z.string().trim().min(3, "Explica el motivo (mínimo 3 caracteres)").max(300, "Máximo 300 caracteres") });
function FormularioAnulacion({ id, onAnulado, onVolver }: { id: string; onAnulado: (p: PagoDetalle) => void; onVolver: () => void }) {
  const anular = useAnularPago(); const refrescar = useRefrescarPagos(); const guardado = useRef<PagoDetalle>(undefined);
  const form = useForm({ defaultValues: { motivo: "" }, validators: { onBlur: schema, onSubmit: schema, onSubmitAsync: async ({ value }) => {
    try { guardado.current = await anular.mutateAsync({ id, ...schema.parse(value) }); }
    catch (e) { if (e instanceof ApiError && (e.status === 409 || e.status === 422)) await refrescar(); return erroresDeServidor(e); }
    return undefined;
  } }, onSubmit: () => { if (guardado.current) { toast.exito("Pago anulado correctamente"); onAnulado(guardado.current); } } });
  return <form noValidate className="space-y-4 border-t border-marea-100 pt-4" onSubmit={e => { e.preventDefault(); void form.handleSubmit(); }}>
    <p className="text-sm">El pago quedará anulado y dejará de contar en el saldo de la cita. El comprobante conservará el motivo y la persona responsable de la anulación.</p>
    <form.Subscribe selector={s => s.errors}>{e => <ErrorFormulario errores={e} />}</form.Subscribe>
    <form.Field name="motivo">{field => <TextAreaField field={field} label="Motivo de anulación" maxLength={300} rows={3} />}</form.Field>
    <div className="flex flex-wrap justify-end gap-3"><Button variante="texto" onClick={onVolver} disabled={anular.isPending}>Volver</Button><form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Confirmar anulación" textoEnviando="Anulando…" />}</form.Subscribe></div>
  </form>;
}
export function ComprobantePago({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const detalle = usePago(id);
  // Al reabrir, no ofrecer acciones con el permiso que quedo en cache de otra consulta.
  const p = detalle.isFetchedAfterMount && !detalle.isError ? detalle.data : undefined;
  const qc = useQueryClient(); const refrescar = useRefrescarPagos();
  const [confirmando, setConfirmando] = useState(false);
  const anulado = (pago: PagoDetalle) => { qc.setQueryData(["pagos", "detalle", id], pago); setConfirmando(false); void refrescar(); };
  return <Modal abierto onCerrar={onCerrar} titulo="Comprobante interno">
    {!detalle.isFetchedAfterMount && !detalle.isError && <Cargando texto="Consultando comprobante…" />}{detalle.isError && <ErrorCarga error={detalle.error} onReintentar={() => detalle.refetch()} />}
    {p && <div className="space-y-4">
      <p className="break-words font-semibold">{p.comprobante}</p><p className="break-words">{p.paciente.nombres} {p.paciente.apellidos}</p>
      <p>{formatearQuetzales(p.montoCentavos)} · {{ EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta" }[p.metodo]}</p>
      <p>{formatearFechaHora(p.fecha)}</p><p>Registrado por {p.registradoPor.nombre}</p><p>Estado: {p.estado === "REGISTRADO" ? "Registrado" : "Anulado"}</p>
      {p.estado === "ANULADO" && <section className="space-y-2 rounded-lg bg-marea-50 p-4" aria-label="Auditoría de anulación"><h3 className="font-medium">Anulación</h3><p className="whitespace-pre-wrap break-words">{p.motivoAnulacion}</p>{p.anuladoPor && <p className="text-sm">Anulado por {p.anuladoPor.nombre}</p>}{p.fechaAnulacion && <p className="text-sm">{formatearFechaHora(p.fechaAnulacion)}</p>}</section>}
      {p.estado === "REGISTRADO" && !p.puedeAnular && <p className="text-sm text-ink-soft">{p.cajaEstado === "CERRADA" ? "La caja está cerrada; este pago no puede anularse." : "Solo el administrador o el responsable de esta caja abierta puede anular el pago."}</p>}
      {p.puedeAnular && (confirmando ? <FormularioAnulacion id={id} onAnulado={anulado} onVolver={() => setConfirmando(false)} /> : <Button variante="contorno" onClick={() => setConfirmando(true)}>Anular pago</Button>)}
      <p className="text-sm text-ink-soft">Comprobante de control interno.</p>
    </div>}
  </Modal>;
}
