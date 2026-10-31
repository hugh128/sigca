import { useForm } from "@tanstack/react-form";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { useContenido } from "@/api/contenido";
import { useEnviarContacto } from "@/api/contacto";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { contactoSchema } from "@/schemas/contacto";

export default function Contacto() {
  const contenido = useContenido();
  const enviar = useEnviarContacto();
  const [confirmacion, setConfirmacion] = useState("");
  useDocumentTitle("Contacto", contenido.data?.general.nombreCentro);
  const info = contenido.data?.contacto;
  const form = useForm({
    defaultValues: { nombre: "", correo: "", telefono: "", asunto: "", mensaje: "" },
    validators: {
      onBlur: contactoSchema,
      onSubmit: contactoSchema,
      onSubmitAsync: async ({ value }) => {
        setConfirmacion("");
        try { await enviar.mutateAsync(contactoSchema.parse(value)); }
        catch (error) { return erroresDeServidor(error); }
        return undefined;
      },
    },
    onSubmit: () => {
      setConfirmacion("Recibimos tu mensaje. El equipo se pondrá en contacto contigo.");
      form.reset();
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-marea-700">Estamos para escucharte</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-marea-900">Contacto</h1>
      <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">Cuéntanos cómo podemos ayudarte. Nuestro equipo te orientará sobre los servicios del centro.</p>
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <aside className="rounded-2xl bg-marea-50 p-6 sm:p-8" aria-label="Información de contacto">
          <h2 className="text-xl font-semibold text-marea-900">Conversemos</h2>
          {contenido.isPending && <Cargando />}
          {contenido.isError && <ErrorCarga error={contenido.error} onReintentar={() => contenido.refetch()} />}
          {info && <ul className="mt-6 space-y-6 text-sm leading-relaxed">
            <li className="flex gap-3"><MapPin aria-hidden="true" className="size-5 shrink-0 text-marea-700" /><span>{info.direccion}</span></li>
            <li className="flex gap-3"><Phone aria-hidden="true" className="size-5 shrink-0 text-marea-700" /><a className="rounded text-marea-800 underline underline-offset-4" href={`tel:${info.telefono.replace(/\s/g, "")}`}>{info.telefono}</a></li>
            <li className="flex gap-3"><Mail aria-hidden="true" className="size-5 shrink-0 text-marea-700" /><a className="break-all rounded text-marea-800 underline underline-offset-4" href={`mailto:${info.correo}`}>{info.correo}</a></li>
          </ul>}
          <p className="mt-8 border-t border-marea-200 pt-5 text-sm text-ink-soft">Para consultas generales y orientación. Evita incluir información clínica o documentos personales en tu mensaje.</p>
        </aside>
        <section aria-labelledby="titulo-mensaje">
          <h2 id="titulo-mensaje" className="text-xl font-semibold text-marea-900">Envíanos un mensaje</h2>
          <p className="mt-2 text-sm text-ink-soft">Todos los campos son obligatorios.</p>
          {confirmacion && <p role="status" aria-label="Confirmación del mensaje" className="mt-6 rounded-lg border-l-4 border-marea-700 bg-marea-50 px-4 py-3">{confirmacion}</p>}
          <form noValidate className="mt-6 space-y-5" onSubmit={e => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}>
            <form.Subscribe selector={s => s.errors}>{errors => <ErrorFormulario errores={errors} />}</form.Subscribe>
            <form.Field name="nombre">{field => <TextField field={field} label="Nombre completo" autoComplete="name" maxLength={120} required />}</form.Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.Field name="correo">{field => <TextField field={field} label="Correo electrónico" type="email" autoComplete="email" maxLength={254} required />}</form.Field>
              <form.Field name="telefono">{field => <TextField field={field} label="Teléfono" type="tel" autoComplete="tel" maxLength={20} required />}</form.Field>
            </div>
            <form.Field name="asunto">{field => <TextField field={field} label="Asunto" maxLength={150} required />}</form.Field>
            <form.Field name="mensaje">{field => <TextAreaField field={field} label="Mensaje" rows={6} maxLength={3000} required ayuda="Entre 10 y 3000 caracteres." />}</form.Field>
            <form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Enviar mensaje" textoEnviando="Enviando…" />}</form.Subscribe>
          </form>
        </section>
      </div>
    </div>
  );
}
