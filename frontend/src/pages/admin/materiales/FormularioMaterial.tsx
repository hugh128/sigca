import { useForm } from "@tanstack/react-form";
import { useGuardarMaterial } from "@/api/materiales";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextField } from "@/components/forms/TextField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { materialSchema } from "@/schemas/materiales";
import { toast } from "@/store/toast";
import type { Material } from "@/types/api";
export function FormularioMaterial({ material, onCerrar }: { material?: Material; onCerrar: () => void }) {
  const guardar = useGuardarMaterial();
  const form = useForm({
    defaultValues: { titulo: material?.titulo ?? "", descripcion: material?.descripcion ?? "", tipo: material?.tipo ?? "", enlace: material?.enlace ?? "" },
    validators: { onBlur: materialSchema, onSubmit: materialSchema, onSubmitAsync: async ({ value }) => {
      try { await guardar.mutateAsync({ id: material?.id, ...materialSchema.parse(value) }); }
      catch (e) { return erroresDeServidor(e); }
      return undefined;
    } },
    onSubmit: () => { toast.exito("Material guardado"); onCerrar(); },
  });
  return <form className="space-y-5" noValidate onSubmit={e => { e.preventDefault(); void form.handleSubmit(); }}>
    <form.Subscribe selector={s => s.errors}>{e => <ErrorFormulario errores={e} />}</form.Subscribe>
    <form.Field name="titulo">{field => <TextField field={field} label="Título" maxLength={160} required />}</form.Field>
    <form.Field name="descripcion">{field => <TextAreaField field={field} label="Descripción" maxLength={2000} rows={4} />}</form.Field>
    <form.Field name="tipo">{field => <TextField field={field} label="Tipo" ayuda="Por ejemplo: documento, video o actividad." maxLength={60} required />}</form.Field>
    <form.Field name="enlace">{field => <TextField field={field} label="Enlace al recurso" type="url" maxLength={2000} required />}</form.Field>
    <form.Subscribe selector={s => s.isSubmitting}>{enviando => <BotonEnviar enviando={enviando} texto="Guardar material" />}</form.Subscribe>
  </form>;
}
