import { useForm, useStore } from "@tanstack/react-form";
import { useRef } from "react";
import { z } from "zod";
import { useCerrarCaja, useRefrescarCajas } from "@/api/cajas";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { quetzalesACentavos } from "@/lib/dinero";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { toast } from "@/store/toast";
import type { CajaDetalle } from "@/types/api";
import { textoDiferencia } from "./DatosCaja";
const schema = z.object({ monto: z.string().transform((v, ctx) => {
  const c = quetzalesACentavos(v);
  if (c === null || !Number.isSafeInteger(c) || c < 0 || c > 999999999) { ctx.issues.push({ code: "custom", input: v, message: "Indica un monto válido de Q0.00 a Q9,999,999.99, con hasta dos decimales" }); return z.NEVER; }
  return c;
}) });
export function FormularioCierre({ caja, onCerrada, onVolver }: { caja: CajaDetalle; onCerrada: (caja: CajaDetalle) => void; onVolver: () => void }) {
  const cerrar = useCerrarCaja(); const refrescar = useRefrescarCajas(); const guardada = useRef<CajaDetalle>(undefined);
  const form = useForm({ defaultValues: { monto: "" }, validators: { onBlur: schema, onSubmit: schema, onSubmitAsync: async ({ value }) => {
    try { guardada.current = await cerrar.mutateAsync({ id: caja.id, efectivoContadoCentavos: schema.parse(value).monto }); }
    catch (e) { if (e instanceof ApiError && (e.status === 409 || e.status === 422)) await refrescar(); return erroresDeServidor(e); }
    return undefined;
  } }, onSubmit: () => { if (guardada.current) { toast.exito("Caja cerrada correctamente"); onCerrada(guardada.current); } } });
  const texto = useStore(form.store, s => s.values.monto); const monto = quetzalesACentavos(texto);
  return <form className="mt-5 space-y-4 rounded-xl border border-marea-200 p-4" noValidate onSubmit={e => { e.preventDefault(); void form.handleSubmit(); }}>
    <p className="text-sm">Al cerrar se conservarán los totales y se bloquearán nuevos cobros y anulaciones en esta caja. El cálculo final usa los pagos válidos al cerrar.</p>
    <form.Subscribe selector={s => s.errors}>{e => <ErrorFormulario errores={e} />}</form.Subscribe>
    <form.Field name="monto">{field => <TextField field={field} label="Efectivo contado (Q)" inputMode="decimal" required />}</form.Field>
    {monto !== null && <p className="text-sm">Diferencia estimada: <strong>{textoDiferencia(monto - caja.resumen.efectivoEsperadoCentavos)}</strong></p>}
    <div className="flex flex-wrap justify-end gap-3"><Button variante="texto" disabled={cerrar.isPending} onClick={onVolver}>Volver</Button><form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Confirmar cierre" textoEnviando="Cerrando caja…" />}</form.Subscribe></div>
  </form>;
}
