import { useForm, useStore } from "@tanstack/react-form";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useGuardarHorarios, useHorariosParaEditar } from "@/api/horarios";
import { AvisoSinGuardar } from "@/components/admin/AvisoSinGuardar";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { CheckboxField } from "@/components/forms/CheckboxField";
import { FormularioSeccion } from "@/components/forms/FormularioSeccion";
import { mensajesDeError, TextField } from "@/components/forms/TextField";
import { ListaHorarios } from "@/components/public/ListaHorarios";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { nombreDia } from "@/lib/horarios";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { horariosSchema } from "@/schemas/horarios";
import { toast } from "@/store/toast";
import { useAuthStore } from "@/store/auth";
import type { DiaHorario, Horarios } from "@/types/api";

const FRANJA_NUEVA = { inicio: "08:00", fin: "12:00" };
const MAX_FRANJAS = 4;
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function FormularioHorarios({ datos, alCambiarSucio }: { datos: Horarios; alCambiarSucio: (s: boolean) => void }) {
  const guardar = useGuardarHorarios();
  const form = useForm({
    defaultValues: { dias: datos.dias.map((d) => ({ dia: d.dia, atiende: d.atiende, franjas: d.franjas.map((f) => ({ inicio: f.inicio, fin: f.fin })) })) },
    validators: {
      onBlur: horariosSchema,
      onSubmit: horariosSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await guardar.mutateAsync(value);
        } catch (e) {
          return erroresDeServidor(e);
        }
        return undefined;
      },
    },
    onSubmit: ({ value, formApi }) => {
      toast.exito("Horarios guardados. Ya se ven en el portal.");
      formApi.reset(value);
    },
  });

  const diasActuales = useStore(form.store, (s) => s.values.dias) as DiaHorario[];

  const copiarLunesALaSemana = () => {
    const lunes = form.getFieldValue("dias[0]");
    for (let i = 1; i <= 4; i++) {
      const dia = form.getFieldValue(`dias[${i}]`);
      form.setFieldValue(`dias[${i}]`, { dia: dia.dia, atiende: lunes.atiende, franjas: lunes.franjas.map((f) => ({ ...f })) });
    }
    toast.info("Se copió el horario del lunes a martes, miércoles, jueves y viernes. Revísalo y guarda.");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio} textoGuardar="Guardar horarios">
        <form.Field name="dias" mode="array">
          {(lista) => (
            <div className="space-y-4">
              {lista.state.value.map((d, i) => {
                const nombre = mayus(nombreDia(d.dia));
                return (
                  <fieldset key={d.dia} className="rounded-xl border border-marea-100 bg-white p-4">
                    <legend className="px-1 text-base font-semibold text-marea-900">{nombre}</legend>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <form.Field name={`dias[${i}].atiende`}>
                        {(c) => (
                          <CheckboxField
                            field={c}
                            label={`Se atiende el ${nombreDia(d.dia)}`}
                            // Al activar un dia se propone una franja inicial; al desactivarlo se limpian.
                            onCambio={(marcado) => {
                              const actuales = form.getFieldValue(`dias[${i}].franjas`);
                              form.setFieldValue(`dias[${i}].franjas`, marcado ? (actuales.length > 0 ? actuales : [{ ...FRANJA_NUEVA }]) : []);
                            }}
                          />
                        )}
                      </form.Field>
                      {i === 0 && (
                        <Button variante="texto" onClick={copiarLunesALaSemana}>
                          <Copy className="size-4" aria-hidden="true" />
                          Copiar el lunes a martes–viernes
                        </Button>
                      )}
                    </div>

                    {d.atiende && (
                      <form.Field name={`dias[${i}].franjas`} mode="array">
                        {(fr) => (
                          <div className="mt-4 space-y-3">
                            {fr.state.value.map((_, j) => (
                              <div key={j} className="flex flex-wrap items-start gap-3">
                                <form.Field name={`dias[${i}].franjas[${j}].inicio`}>
                                  {(c) => <TextField field={c} type="time" label={`${nombre}, franja ${j + 1}: desde`} className="w-36" />}
                                </form.Field>
                                <form.Field name={`dias[${i}].franjas[${j}].fin`}>
                                  {(c) => <TextField field={c} type="time" label={`${nombre}, franja ${j + 1}: hasta`} className="w-36" />}
                                </form.Field>
                                <Button variante="texto" aria-label={`Quitar la franja ${j + 1} del ${nombreDia(d.dia)}`} title="Quitar franja"
                                  className="mt-7 text-danger hover:bg-danger-soft" onClick={() => fr.removeValue(j)}>
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                              </div>
                            ))}
                            {mensajesDeError(fr)[0] && <p role="alert" className="text-sm font-medium text-danger">{mensajesDeError(fr)[0]}</p>}
                            <Button variante="contorno" disabled={fr.state.value.length >= MAX_FRANJAS}
                              onClick={() => fr.pushValue(fr.state.value.length === 0 ? { ...FRANJA_NUEVA } : { inicio: "14:00", fin: "18:00" })}>
                              <Plus className="size-4" aria-hidden="true" />
                              Agregar franja
                            </Button>
                          </div>
                        )}
                      </form.Field>
                    )}
                  </fieldset>
                );
              })}
            </div>
          )}
        </form.Field>
      </FormularioSeccion>

      <aside aria-labelledby="vista-previa" className="lg:sticky lg:top-6 lg:self-start">
        <h2 id="vista-previa" className="text-base font-semibold text-marea-900">Así se verá en el portal</h2>
        <div className="mt-2 rounded-xl border border-marea-100 bg-white px-4 py-1">
          <ListaHorarios dias={diasActuales} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Los días consecutivos con el mismo horario se muestran juntos. La nota que acompaña los horarios se edita en{" "}
          <Link to="/admin/contenido?seccion=general" className="text-marea-700 underline underline-offset-4">Contenido › General</Link>.
        </p>
      </aside>
    </div>
  );
}

function EdicionHorarios() {
  const { data, listo, isError, error, refetch } = useHorariosParaEditar();
  const [sucio, setSucio] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <AvisoSinGuardar sucio={sucio} />
      <EncabezadoPagina titulo="Horarios de atención" descripcion="Define qué días se atiende y en qué franjas. Un día puede tener varias (por ejemplo, mañana y tarde)." />
      <div className="mt-8">
        {isError && !data && <ErrorCarga error={error} onReintentar={() => refetch()} />}
        {!listo && !isError && <Cargando texto="Cargando horarios…" />}
        {listo && data && <FormularioHorarios datos={data} alCambiarSucio={setSucio} />}
      </div>
    </div>
  );
}

function ConsultaHorarios() {
  const { data, listo, isError, error, refetch } = useHorariosParaEditar();
  return <div className="mx-auto max-w-3xl">
    <EncabezadoPagina titulo="Horarios de atención" descripcion="Consulta los días y las franjas de atención para coordinar las citas. Los cambios los realiza el administrador." />
    <div className="mt-8">
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}
      {!listo && !isError && <Cargando texto="Cargando horarios…" />}
      {listo && data && <div className="rounded-xl border border-marea-100 bg-white p-5"><ListaHorarios dias={data.dias} /></div>}
    </div>
  </div>;
}

export default function HorariosAdmin() {
  useDocumentTitle("Horarios de atención", "SIGCA");
  const admin = useAuthStore(s => s.usuario?.rol === "ADMINISTRADOR");
  return admin ? <EdicionHorarios /> : <ConsultaHorarios />;
}
