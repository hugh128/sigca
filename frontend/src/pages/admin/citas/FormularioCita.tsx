import { useForm, useStore } from "@tanstack/react-form";
import { useCallback, useRef, useState } from "react";
import { useCrearCita, useProfesionales, useReprogramarCita } from "@/api/citas";
import { useServiciosAdmin } from "@/api/servicios";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { hoyGuatemala } from "@/lib/fechas";
import { formatearDuracion, formatearFechaLarga, formatearHora, formatearQuetzales } from "@/lib/format";
import { citaFormSchema } from "@/schemas/citas";
import { toast } from "@/store/toast";
import type { Cita, Paciente } from "@/types/api";
import { HorariosDisponibles } from "./HorariosDisponibles";
import { SelectorPaciente } from "./SelectorPaciente";

interface Props {
  /** Si se indica, se REPROGRAMA esa cita (el paciente y el servicio no cambian). */
  cita?: Cita;
  /** Paciente ya elegido (p. ej. al programar desde su ficha). */
  paciente?: Paciente;
  fechaInicial?: string;
  onCerrar: () => void;
  onGuardado?: (c: Cita) => void;
}

export function FormularioCita({ cita, paciente: pacienteInicial, fechaInicial, onCerrar, onGuardado }: Props) {
  const reprogramando = Boolean(cita);
  const crear = useCrearCita();
  const reprogramar = useReprogramarCita();
  const profesionales = useProfesionales();
  const servicios = useServiciosAdmin();
  const guardada = useRef<Cita>(undefined);
  const [paciente, setPaciente] = useState<Paciente | null>(pacienteInicial ?? null);

  const form = useForm({
    defaultValues: {
      pacienteId: cita?.paciente.id ?? pacienteInicial?.id ?? "",
      servicioId: cita?.servicio.id ?? "",
      profesionalId: cita?.profesional.id ?? "",
      fecha: cita?.fecha ?? fechaInicial ?? "",
      horaInicio: cita?.horaInicio ?? "",
      observaciones: cita?.observaciones ?? "",
    },
    validators: {
      onBlur: citaFormSchema,
      onSubmit: citaFormSchema,
      onSubmitAsync: async ({ value }) => {
        const v = citaFormSchema.parse(value);
        try {
          guardada.current = cita
            ? await reprogramar.mutateAsync({ id: cita.id, fecha: v.fecha, horaInicio: v.horaInicio, profesionalId: v.profesionalId, observaciones: v.observaciones })
            : await crear.mutateAsync({ ...v, observaciones: v.observaciones || undefined });
        } catch (e) {
          return erroresDeServidor(e);
        }
        return undefined;
      },
    },
    onSubmit: () => {
      toast.exito(reprogramando ? "Cita reprogramada" : "Cita programada");
      if (guardada.current) onGuardado?.(guardada.current);
      onCerrar();
    },
  });

  const valores = useStore(form.store, (s) => s.values);
  // Los errores de «paciente» y «horario» solo se muestran tras intentar enviar: antes de eso es normal que falten.
  const intentos = useStore(form.store, (s) => s.submissionAttempts);
  // Al cambiar servicio, profesional o fecha, el horario elegido ya no tiene sentido
  const limpiarHorario = useCallback(() => form.setFieldValue("horaInicio", ""), [form]);
  // Elegir un horario (o paciente) no pasa por un campo de texto que "se abandone", asi que se vuelve a validar
  // a mano: si no, quedaria el error de «elige un horario» que se marco antes de que cargaran los horarios.
  const alElegirHorario = useCallback(
    (h: string) => {
      form.setFieldValue("horaInicio", h);
      void form.validateField("horaInicio", "blur");
    },
    [form],
  );

  const serviciosActivos = (servicios.data ?? []).filter((s) => s.estado === "ACTIVO");
  const servicioElegido = serviciosActivos.find((s) => s.id === valores.servicioId) ?? (cita ? { nombre: cita.servicio.nombre, duracionMin: cita.duracionMin, precioCentavos: cita.precioCentavos } : undefined);

  return (
    <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}>
      <form.Subscribe selector={(s) => s.errors}>{(errores) => <ErrorFormulario errores={errores} />}</form.Subscribe>

      {reprogramando ? (
        <div className="rounded-lg bg-marea-50 px-4 py-3 text-sm">
          <p className="font-medium text-ink">{cita!.paciente.nombres} {cita!.paciente.apellidos} · {cita!.servicio.nombre}</p>
          <p className="text-ink-soft">Ahora: {formatearFechaLarga(cita!.fecha)}, {formatearHora(cita!.horaInicio)} – {formatearHora(cita!.horaFin)}</p>
        </div>
      ) : (
        <form.Field name="pacienteId">
          {(c) => (
            <SelectorPaciente
              elegido={paciente}
              bloqueado={Boolean(pacienteInicial)}
              error={intentos > 0 && c.state.meta.errors.length > 0 ? "Elige al paciente" : undefined}
              onElegir={(p) => { setPaciente(p); c.handleChange(p?.id ?? ""); c.handleBlur(); }}
            />
          )}
        </form.Field>
      )}

      {!reprogramando && (
        <form.Field name="servicioId" listeners={{ onChange: limpiarHorario }}>
          {(c) => (
            <SelectField field={c} label="Servicio"
              opciones={[{ valor: "", etiqueta: servicios.isPending ? "Cargando servicios…" : "Selecciona un servicio…" },
                ...serviciosActivos.map((s) => ({ valor: s.id, etiqueta: `${s.nombre} · ${formatearDuracion(s.duracionMin)}` }))]} />
          )}
        </form.Field>
      )}
      {servicioElegido && !reprogramando && "precioCentavos" in servicioElegido && servicioElegido.precioCentavos !== undefined && (
        <p className="-mt-3 text-sm text-ink-soft">Precio: {formatearQuetzales(servicioElegido.precioCentavos)}. La duración y el precio se registran en la cita.</p>
      )}

      <form.Field name="profesionalId" listeners={{ onChange: limpiarHorario }}>
        {(c) => (
          <SelectField field={c} label="Profesional"
            opciones={[{ valor: "", etiqueta: profesionales.isPending ? "Cargando profesionales…" : "Selecciona un profesional…" },
              ...(profesionales.data ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre }))]} />
        )}
      </form.Field>

      <form.Field name="fecha" listeners={{ onChange: limpiarHorario }}>
        {(c) => <TextField field={c} label="Fecha" type="date" min={hoyGuatemala()} className="sm:max-w-56" />}
      </form.Field>

      <form.Field name="horaInicio">
        {(c) => (
          <HorariosDisponibles
            params={{ profesionalId: valores.profesionalId, servicioId: valores.servicioId, fecha: valores.fecha >= hoyGuatemala() ? valores.fecha : "", excluirCitaId: cita?.id }}
            valor={c.state.value}
            onElegir={alElegirHorario}
            error={intentos > 0 && c.state.meta.errors.length > 0 ? "Elige uno de los horarios disponibles" : undefined}
          />
        )}
      </form.Field>

      <form.Field name="observaciones">
        {(c) => <TextAreaField field={c} label="Observaciones (opcional)" rows={3} />}
      </form.Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button variante="texto" onClick={onCerrar}>Cancelar</Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => <BotonEnviar enviando={enviando} texto={reprogramando ? "Reprogramar cita" : "Programar cita"} />}
        </form.Subscribe>
      </div>
    </form>
  );
}
