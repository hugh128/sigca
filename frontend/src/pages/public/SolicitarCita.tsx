import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useServiciosPublicos } from "@/api/servicios";
import { useEnviarSolicitud } from "@/api/solicitudes";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { ErrorCarga } from "@/components/ui/Estados";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { hoyGuatemala } from "@/lib/fechas";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { solicitudSchema } from "@/schemas/solicitudes";

export default function SolicitarCita() {
  useDocumentTitle("Solicitar cita", "SIGCA");
  const [params] = useSearchParams();
  const inicial = params.get("servicio") ?? "";
  const servicios = useServiciosPublicos();
  const enviar = useEnviarSolicitud();
  const [confirmacion, setConfirmacion] = useState("");
  const form = useForm({
    defaultValues: { nombre: "", correo: "", telefono: "", servicioId: inicial, fechaPreferida: "", mensaje: "" },
    validators: {
      onBlur: solicitudSchema, onSubmit: solicitudSchema,
      onSubmitAsync: async ({ value }) => {
        setConfirmacion("");
        try { await enviar.mutateAsync(solicitudSchema.parse(value)); }
        catch (error) { return erroresDeServidor(error); }
        return undefined;
      },
    },
    onSubmit: () => {
      setConfirmacion("Recibimos tu solicitud. El equipo te contactará para coordinar la cita; la fecha todavía no está reservada.");
      form.reset({ nombre: "", correo: "", telefono: "", servicioId: "", fechaPreferida: "", mensaje: "" });
    },
  });
  useEffect(() => {
    if (servicios.data && inicial && !servicios.data.some(s => s.id === inicial) && form.getFieldValue("servicioId") === inicial) form.setFieldValue("servicioId", "");
  }, [servicios.data, inicial, form]);

  return <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
    <p className="text-sm font-medium uppercase tracking-widest text-marea-700">Demos el primer paso</p>
    <h1 className="mt-3 text-4xl font-semibold text-marea-900">Solicitar cita</h1>
    <p className="mt-4 font-serif text-lg leading-relaxed text-ink-soft">Indícanos el servicio y la fecha que prefieres. Nuestro equipo te contactará para coordinar la atención.</p>
    <p className="mt-6 rounded-xl bg-marea-50 p-4 text-sm">Enviar esta solicitud no reserva un horario. La cita queda programada cuando el equipo confirma contigo los detalles.</p>
    {confirmacion && <p role="status" aria-label="Solicitud recibida" className="mt-6 rounded-lg border-l-4 border-marea-700 bg-marea-50 p-4">{confirmacion}</p>}
    {servicios.isError && <ErrorCarga error={servicios.error} onReintentar={() => servicios.refetch()} />}
    {servicios.data?.length === 0 && <p role="status" className="mt-6 text-sm">Por ahora no hay servicios disponibles para solicitar una cita.</p>}
    <form noValidate className="mt-8 space-y-5" onSubmit={e => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}>
      <form.Subscribe selector={s => s.errors}>{errors => <ErrorFormulario errores={errors} />}</form.Subscribe>
      <form.Field name="nombre">{field => <TextField field={field} label="Nombre completo" autoComplete="name" maxLength={120} required />}</form.Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="correo">{field => <TextField field={field} label="Correo electrónico" type="email" autoComplete="email" maxLength={254} required />}</form.Field>
        <form.Field name="telefono">{field => <TextField field={field} label="Teléfono" type="tel" autoComplete="tel" maxLength={20} required />}</form.Field>
      </div>
      <form.Field name="servicioId">{field => <SelectField field={field} label="Servicio" opciones={[{ valor: "", etiqueta: servicios.isPending ? "Cargando servicios…" : "Selecciona un servicio…" }, ...(servicios.data ?? []).map(s => ({ valor: s.id, etiqueta: s.nombre }))]} />}</form.Field>
      <form.Field name="fechaPreferida">{field => <TextField field={field} label="Fecha preferida" type="date" min={hoyGuatemala()} required />}</form.Field>
      <form.Field name="mensaje">{field => <TextAreaField field={field} label="Mensaje adicional (opcional)" maxLength={1000} rows={4} />}</form.Field>
      <form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Enviar solicitud" textoEnviando="Enviando…" />}</form.Subscribe>
    </form>
  </div>;
}
