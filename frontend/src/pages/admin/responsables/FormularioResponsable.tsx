import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { useActualizarResponsable, useCrearResponsable } from "@/api/responsables";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ControlImagen } from "@/components/forms/ControlImagen";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { responsableFormSchema } from "@/schemas/responsables";
import { toast } from "@/store/toast";
import type { Responsable } from "@/types/api";

export const PARENTESCOS = ["Madre", "Padre", "Abuela", "Abuelo", "Tía", "Tío", "Hermana", "Hermano", "Tutor legal"];

interface Props {
  responsable?: Responsable;
  /** Si se indica, el responsable nuevo se asocia de inmediato a este paciente. */
  pacienteId?: string;
  onCerrar: () => void;
  onGuardado?: (r: Responsable) => void;
}

export function FormularioResponsable({ responsable, pacienteId, onCerrar, onGuardado }: Props) {
  const crear = useCrearResponsable();
  const actualizar = useActualizarResponsable();
  const guardado = useRef<Responsable>(undefined);

  const form = useForm({
    defaultValues: {
      nombres: responsable?.nombres ?? "",
      apellidos: responsable?.apellidos ?? "",
      parentesco: responsable?.parentesco ?? "",
      telefono: responsable?.telefono ?? "",
      email: responsable?.email ?? "",
      direccion: responsable?.direccion ?? "",
      fotoUrl: responsable?.fotoUrl ?? "",
      fotoKey: responsable?.fotoKey ?? "",
    },
    validators: {
      onBlur: responsableFormSchema,
      onSubmit: responsableFormSchema,
      onSubmitAsync: async ({ value }) => {
        const v = responsableFormSchema.parse(value);
        try {
          guardado.current = responsable
            ? await actualizar.mutateAsync({ id: responsable.id, ...v })
            : await crear.mutateAsync({ ...v, pacientes: pacienteId ? [pacienteId] : [] });
        } catch (e) {
          return erroresDeServidor(e);
        }
        return undefined;
      },
    },
    onSubmit: () => {
      toast.exito(responsable ? "Cambios guardados" : pacienteId ? "Responsable registrado y asociado al paciente" : "Responsable registrado");
      if (guardado.current) onGuardado?.(guardado.current);
      onCerrar();
    },
  });

  return (
    <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}>
      <form.Subscribe selector={(s) => s.errors}>{(errores) => <ErrorFormulario errores={errores} />}</form.Subscribe>
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="nombres">{(c) => <TextField field={c} label="Nombres" autoFocus autoComplete="off" />}</form.Field>
        <form.Field name="apellidos">{(c) => <TextField field={c} label="Apellidos" autoComplete="off" />}</form.Field>
      </div>
      <form.Field name="parentesco">
        {(c) => (
          <>
            <TextField field={c} label="Parentesco" list="parentescos" placeholder="Madre, padre, tutor legal…" autoComplete="off" />
            <datalist id="parentescos">{PARENTESCOS.map((p) => <option key={p} value={p} />)}</datalist>
          </>
        )}
      </form.Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="telefono">{(c) => <TextField field={c} label="Teléfono" type="tel" autoComplete="off" />}</form.Field>
        <form.Field name="email">{(c) => <TextField field={c} label="Correo electrónico" type="email" autoComplete="off" />}</form.Field>
      </div>
      <form.Field name="direccion">{(c) => <TextField field={c} label="Dirección" autoComplete="off" />}</form.Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">Fotografía (opcional)</p>
        <ControlImagen form={form} nombreUrl="fotoUrl" nombreKey="fotoKey" carpeta="responsables" etiqueta="Responsable" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variante="texto" onClick={onCerrar}>Cancelar</Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => <BotonEnviar enviando={enviando} texto={responsable ? "Guardar cambios" : pacienteId ? "Registrar y asociar" : "Registrar responsable"} />}
        </form.Subscribe>
      </div>
    </form>
  );
}
