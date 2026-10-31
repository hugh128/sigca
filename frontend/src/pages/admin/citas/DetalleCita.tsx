import { CalendarClock, CircleCheck, CircleX, History, Pencil } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useCambiarEstadoCita, useCita } from "@/api/citas";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { accionesDisponibles, ETIQUETA_ESTADO, TONO_ESTADO, tituloCita } from "@/lib/citas";
import { textoEdad } from "@/lib/fechas";
import { formatearDuracion, formatearFechaHora, formatearFechaLarga, formatearHora, formatearQuetzales } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { FormularioCita } from "./FormularioCita";

type Vista = "detalle" | "cancelar" | "reprogramar";

/** Todo lo que se puede ver y hacer con una cita, en una sola ventana. Lo usan el listado, el calendario y la ficha del paciente. */
export function DetalleCita({ citaId, onCerrar }: { citaId: string; onCerrar: () => void }) {
  const { data: cita, isPending, isError, error, refetch } = useCita(citaId);
  const rol = useAuthStore((s) => s.usuario?.rol);
  const cambiar = useCambiarEstadoCita();
  const [vista, setVista] = useState<Vista>("detalle");
  const [motivo, setMotivo] = useState("");
  const gestion = rol === "ADMINISTRADOR" || rol === "RECEPCIONISTA";
  const acciones = cita && rol ? accionesDisponibles(cita.estado, rol) : null;

  const cambiarEstado = async (estado: "CONFIRMADA" | "COMPLETADA" | "CANCELADA") => {
    if (!cita) return;
    try {
      await cambiar.mutateAsync({ id: cita.id, estado, motivo: estado === "CANCELADA" ? motivo.trim() || undefined : undefined });
      toast.exito(estado === "CONFIRMADA" ? "Cita confirmada" : estado === "COMPLETADA" ? "Cita marcada como completada" : "Cita cancelada");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cambiar el estado de la cita");
    }
    setMotivo("");
    setVista("detalle");
  };

  return (
    <>
      <Modal abierto={vista === "detalle"} onCerrar={onCerrar} ancho="lg" titulo={cita ? tituloCita(cita) : "Cita"} descripcion={cita ? formatearFechaLarga(cita.fecha) : undefined}>
        {isPending && <Cargando texto="Cargando cita…" />}
        {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}
        {cita && acciones && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-lg font-medium text-marea-900">
                <CalendarClock className="size-5 text-marea-500" aria-hidden="true" />
                {formatearHora(cita.horaInicio)} – {formatearHora(cita.horaFin)}
              </p>
              <Badge tono={TONO_ESTADO[cita.estado]}>{ETIQUETA_ESTADO[cita.estado]}</Badge>
            </div>

            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-ink-soft">Paciente</dt>
                <dd className="mt-1 flex items-center gap-2.5">
                  <Avatar nombres={cita.paciente.nombres} apellidos={cita.paciente.apellidos} url={cita.paciente.fotoUrl} tamano="sm" />
                  <span>
                    {gestion ? (
                      <Link to={`/admin/pacientes/${cita.paciente.id}`} onClick={onCerrar} className="rounded font-medium text-marea-800 underline-offset-4 hover:underline">
                        {cita.paciente.nombres} {cita.paciente.apellidos}
                      </Link>
                    ) : (
                      <span className="font-medium">{cita.paciente.nombres} {cita.paciente.apellidos}</span>
                    )}
                    <span className="block text-sm text-ink-soft">{textoEdad(cita.paciente.edad)}{cita.paciente.esMenor && " · menor de edad"}</span>
                  </span>
                </dd>
              </div>
              <div><dt className="text-sm text-ink-soft">Profesional</dt><dd className="mt-1">{cita.profesional.nombre}</dd></div>
              <div><dt className="text-sm text-ink-soft">Servicio</dt><dd className="mt-1">{cita.servicio.nombre}</dd></div>
              <div>
                <dt className="text-sm text-ink-soft">Duración{cita.precioCentavos !== undefined && " y precio"}</dt>
                <dd className="mt-1">{formatearDuracion(cita.duracionMin)}{cita.precioCentavos !== undefined && ` · ${formatearQuetzales(cita.precioCentavos)}`}</dd>
              </div>
              {cita.observaciones && <div className="sm:col-span-2"><dt className="text-sm text-ink-soft">Observaciones</dt><dd className="mt-1 whitespace-pre-line">{cita.observaciones}</dd></div>}
              {cita.motivoCancelacion && <div className="sm:col-span-2"><dt className="text-sm text-ink-soft">Motivo de la cancelación</dt><dd className="mt-1">{cita.motivoCancelacion}</dd></div>}
            </dl>

            {gestion && <Link to={`/admin/pagos?cita=${cita.id}`} onClick={onCerrar} className="inline-block rounded text-marea-700 underline">Pagos y saldo de la cita</Link>}

            <section aria-labelledby="historial">
              <h3 id="historial" className="flex items-center gap-2 text-sm font-semibold text-marea-900">
                <History className="size-4" aria-hidden="true" />
                Historial
              </h3>
              <ol className="mt-2 space-y-2 border-l-2 border-marea-100 pl-4">
                {cita.historial.map((h, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{ETIQUETA_ESTADO[h.estado]}</span>
                    <span className="text-ink-soft"> · {formatearFechaHora(h.fecha)}{typeof h.usuario === "object" && h.usuario && ` · ${h.usuario.nombre}`}</span>
                    {h.nota && <span className="block text-ink-soft">{h.nota}</span>}
                  </li>
                ))}
              </ol>
            </section>

            {(acciones.confirmar || acciones.completar || acciones.cancelar || acciones.reprogramar) && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-marea-100 pt-4">
                {acciones.cancelar && (
                  <Button variante="texto" className="text-danger hover:bg-danger-soft" onClick={() => setVista("cancelar")} disabled={cambiar.isPending}>
                    <CircleX className="size-4" aria-hidden="true" />
                    Cancelar cita
                  </Button>
                )}
                {acciones.reprogramar && (
                  <Button variante="contorno" onClick={() => setVista("reprogramar")} disabled={cambiar.isPending}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Reprogramar
                  </Button>
                )}
                {acciones.confirmar && (
                  <Button onClick={() => void cambiarEstado("CONFIRMADA")} disabled={cambiar.isPending}>
                    <CircleCheck className="size-4" aria-hidden="true" />
                    Confirmar cita
                  </Button>
                )}
                {acciones.completar && (
                  <Button onClick={() => void cambiarEstado("COMPLETADA")} disabled={cambiar.isPending}>
                    <CircleCheck className="size-4" aria-hidden="true" />
                    Marcar como completada
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={vista === "cancelar"}
        titulo="¿Cancelar esta cita?"
        textoConfirmar="Cancelar cita"
        textoCancelar="Volver"
        peligro
        cargando={cambiar.isPending}
        onCancelar={() => { setMotivo(""); setVista("detalle"); }}
        onConfirmar={() => void cambiarEstado("CANCELADA")}
      >
        <p>
          {cita && `${tituloCita(cita)}, ${formatearFechaLarga(cita.fecha)} a las ${formatearHora(cita.horaInicio)}. `}
          El horario quedará libre y la cita no podrá volver a activarse: si hace falta, se programa una nueva.
        </p>
        <label htmlFor="motivo-cancelacion" className="mt-4 block text-sm font-medium text-ink">Motivo (opcional)</label>
        <textarea id="motivo-cancelacion" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300}
          className="mt-1.5 block w-full rounded-lg border border-marea-200 bg-white px-3.5 py-2.5 text-ink" />
      </ConfirmDialog>

      <Modal abierto={vista === "reprogramar"} onCerrar={() => setVista("detalle")} ancho="lg" titulo="Reprogramar cita">
        {vista === "reprogramar" && cita && <FormularioCita cita={cita} onCerrar={() => setVista("detalle")} />}
      </Modal>
    </>
  );
}
