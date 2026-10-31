import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { z } from "zod";
import { useRegistrarPago, useRefrescarPagos } from "@/api/pagos";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { ApiError } from "@/lib/api";
import { quetzalesACentavos } from "@/lib/dinero";
import { toast } from "@/store/toast";
export function FormularioPago({ citaId, saldo }: { citaId: string; saldo: number }) {
  const registrar = useRegistrarPago(); const refrescar = useRefrescarPagos(); const comprobante = useRef("");
  const schema = z.object({ monto: z.string().transform((v, ctx) => {
    const centavos = quetzalesACentavos(v);
    if (centavos === null || !Number.isSafeInteger(centavos) || centavos <= 0 || centavos > saldo) {
      ctx.issues.push({ code: "custom", input: v, message: "Escribe un monto positivo, con hasta dos decimales y sin superar el saldo pendiente" }); return z.NEVER;
    }
    return centavos;
  }), metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA"], "Elige el método de pago") });
  const form = useForm({ defaultValues: { monto: "", metodo: "" }, validators: {
    onBlur: schema, onSubmit: schema, onSubmitAsync: async ({ value }) => {
      const d = schema.parse(value);
      try { const pago = await registrar.mutateAsync({ citaId, montoCentavos: d.monto, metodo: d.metodo }); comprobante.current = pago.comprobante; }
      catch (e) { if (e instanceof ApiError && (e.status === 422 || e.status === 409)) await refrescar(); return erroresDeServidor(e); }
      return undefined;
    },
  }, onSubmit: () => { toast.exito(`Pago registrado: ${comprobante.current}`); form.reset(); void refrescar(); } });
  return <form noValidate className="mt-5 max-w-md space-y-4" onSubmit={e => { e.preventDefault(); void form.handleSubmit(); }}>
    <form.Subscribe selector={s => s.errors}>{e => <ErrorFormulario errores={e} />}</form.Subscribe>
    <form.Field name="monto">{field => <TextField field={field} label="Monto a pagar (Q)" inputMode="decimal" required />}</form.Field>
    <form.Field name="metodo">{field => <SelectField field={field} label="Método de pago" opciones={[{ valor: "", etiqueta: "Selecciona un método…" }, { valor: "EFECTIVO", etiqueta: "Efectivo" }, { valor: "TRANSFERENCIA", etiqueta: "Transferencia" }, { valor: "TARJETA", etiqueta: "Tarjeta" }]} />}</form.Field>
    <form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Registrar pago" />}</form.Subscribe>
  </form>;
}
