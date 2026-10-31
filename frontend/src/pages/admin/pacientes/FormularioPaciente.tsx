import { useForm } from "@tanstack/react-form";
import { Info } from "lucide-react";
import { useRef } from "react";
import { useActualizarPaciente, useCrearPaciente } from "@/api/pacientes";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ControlImagen } from "@/components/forms/ControlImagen";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { calcularEdad, esFechaValida, hoyGuatemala, MAYORIA_DE_EDAD, textoEdad } from "@/lib/fechas";
import { pacienteFormSchema } from "@/schemas/pacientes";
import { toast } from "@/store/toast";
import type { Paciente, Sexo } from "@/types/api";

const OPCIONES_SEXO = [
  { valor: "", etiqueta: "Selecciona…" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "OTRO", etiqueta: "Otro" },
];

interface Props {
  paciente?: Paciente;
  onCerrar: () => void;
  onGuardado?: (p: Paciente) => void;
}

/** Edad que se mostrara segun la fecha escrita; null si aun no es una fecha valida y no futura. */
function edadDe(fecha: string): number | null {
  return esFechaValida(fecha) && fecha <= hoyGuatemala() ? calcularEdad(fecha) : null;
}

export function FormularioPaciente({ paciente, onCerrar, onGuardado }: Props) {
  const crear = useCrearPaciente();
  const actualizar = useActualizarPaciente();
  const guardado = useRef<Paciente>(undefined);

  const form = useForm({
    defaultValues: {
      nombres: paciente?.nombres ?? "",
      apellidos: paciente?.apellidos ?? "",
      fechaNacimiento: paciente?.fechaNacimiento ?? "",
      sexo: (paciente?.sexo ?? "") as Sexo | "",
      telefono: paciente?.telefono ?? "",
      direccion: paciente?.direccion ?? "",
      fechaInicio: paciente?.fechaInicio ?? hoyGuatemala(),
      observaciones: paciente?.observaciones ?? "",
      fotoUrl: paciente?.fotoUrl ?? "",
      fotoKey: paciente?.fotoKey ?? "",
    },
    validators: {
      onBlur: pacienteFormSchema,
      onSubmit: pacienteFormSchema,
      onSubmitAsync: async ({ value }) => {
        const v = pacienteFormSchema.parse(value);
        try {
          guardado.current = paciente
            ? await actualizar.mutateAsync({ id: paciente.id, ...v })
            : await crear.mutateAsync(v);
        } catch (e) {
          return erroresDeServidor(e);
        }
        return undefined;
      },
    },
    onSubmit: () => {
      toast.exito(paciente ? "Cambios guardados" : "Paciente registrado");
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

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="fechaNacimiento">{(c) => <TextField field={c} label="Fecha de nacimiento" type="date" max={hoyGuatemala()} />}</form.Field>
        <form.Field name="sexo">{(c) => <SelectField field={c} label="Sexo" opciones={OPCIONES_SEXO} />}</form.Field>
      </div>

      {/* La edad se calcula a medida que se escribe la fecha, con la misma regla que el servidor */}
      <form.Subscribe selector={(s) => s.values.fechaNacimiento}>
        {(fecha) => {
          const edad = edadDe(fecha);
          if (edad === null) return null;
          const menor = edad < MAYORIA_DE_EDAD;
          return (
            <p role="status" className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${menor ? "bg-sol-100 text-ink" : "bg-marea-50 text-ink-soft"}`}>
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Edad: <strong>{textoEdad(edad)}</strong>.
                {menor && " Es menor de edad: necesitará al menos un responsable antes de programar citas."}
              </span>
            </p>
          );
        }}
      </form.Subscribe>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="telefono">{(c) => <TextField field={c} label="Teléfono" type="tel" autoComplete="off" />}</form.Field>
        <form.Field name="fechaInicio">{(c) => <TextField field={c} label="Inicio del proceso" type="date" />}</form.Field>
      </div>
      <form.Field name="direccion">{(c) => <TextField field={c} label="Dirección" autoComplete="off" />}</form.Field>
      <form.Field name="observaciones">
        {(c) => <TextAreaField field={c} label="Observaciones administrativas (opcional)" rows={3} />}
      </form.Field>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">Fotografía (opcional)</p>
        <ControlImagen form={form} nombreUrl="fotoUrl" nombreKey="fotoKey" carpeta="pacientes" etiqueta="Paciente" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variante="texto" onClick={onCerrar}>Cancelar</Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => <BotonEnviar enviando={enviando} texto={paciente ? "Guardar cambios" : "Registrar paciente"} />}
        </form.Subscribe>
      </div>
    </form>
  );
}
