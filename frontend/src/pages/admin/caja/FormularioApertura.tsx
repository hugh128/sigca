import { useForm } from "@tanstack/react-form";
import { useAbrirCaja, useRefrescarCajas } from "@/api/cajas";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextField } from "@/components/forms/TextField";
import { ApiError } from "@/lib/api";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { aperturaCajaSchema } from "@/schemas/cajas";
import { toast } from "@/store/toast";
export function FormularioApertura() {
  const abrir = useAbrirCaja(); const refrescar = useRefrescarCajas();
  const form = useForm({
    defaultValues: { monto: "" },
    validators: { onBlur: aperturaCajaSchema, onSubmit: aperturaCajaSchema, onSubmitAsync: async ({ value }) => {
      try { await abrir.mutateAsync(aperturaCajaSchema.parse(value).monto); }
      catch (e) {
        if (e instanceof ApiError && e.status === 409) await refrescar();
        return erroresDeServidor(e);
      }
      return undefined;
    } },
    onSubmit: () => { toast.exito("Caja abierta correctamente"); void refrescar(); },
  });
  return <section className="mt-5 rounded-xl border border-marea-100 bg-white p-5" aria-labelledby="abrir-caja">
    <h2 id="abrir-caja" className="text-xl font-semibold">Abrir mi caja</h2>
    <p className="mt-2 text-sm text-ink-soft">Registra el efectivo con el que inicias la atención. Puedes abrir con Q0.00. La caja quedará a tu nombre.</p>
    <form className="mt-5 max-w-md space-y-4" noValidate onSubmit={e => { e.preventDefault(); void form.handleSubmit(); }}>
      <form.Subscribe selector={s => s.errors}>{e => <ErrorFormulario errores={e} />}</form.Subscribe>
      <form.Field name="monto">{field => <TextField field={field} label="Monto inicial (Q)" inputMode="decimal" placeholder="200.00" required />}</form.Field>
      <form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Abrir mi caja" textoEnviando="Abriendo caja…" />}</form.Subscribe>
    </form>
  </section>;
}
