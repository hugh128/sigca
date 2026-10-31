import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useCallback, useMemo, useState } from "react";
import { useCitas, useProfesionales } from "@/api/citas";
import { useHorarios } from "@/api/horarios";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ESTADOS_CITA, ETIQUETA_ESTADO, TONO_ESTADO, citaAEvento } from "@/lib/citas";
import { hoyGuatemala } from "@/lib/fechas";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { DiaSemana, EstadoCita } from "@/types/api";
import { DetalleCita } from "./DetalleCita";
import { FormularioCita } from "./FormularioCita";

const DIA_FC: Record<DiaSemana, number> = { DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6 };

function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Opciones de FullCalendar como CONSTANTES: si se crearan de nuevo en cada render, el calendario las
 * consideraria cambiadas, se reconfiguraria y volveria a avisar el rango visible, y eso volveria a
 * renderizar esta pantalla (un bucle infinito).
 */
const PLUGINS = [dayGridPlugin, timeGridPlugin, interactionPlugin];
const LOCALES = [esLocale];
const BARRA = { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" };
const TEXTOS_BOTONES = { today: "Hoy", month: "Mes", week: "Semana", day: "Día" };
const FORMATO_HORA = { hour: "numeric", minute: "2-digit", hour12: true, meridiem: "short" } as const;

export default function Calendario() {
  useDocumentTitle("Calendario", "SIGCA");
  const rol = useAuthStore((s) => s.usuario?.rol);
  const gestion = rol === "ADMINISTRADOR" || rol === "RECEPCIONISTA";
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null);
  const [profesionalId, setProfesionalId] = useState("");
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState<string | null>(null);
  // La vista inicial se decide una sola vez (en pantallas chicas, el dia)
  const [vistaInicial] = useState(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"));

  // Solo se actualiza el estado si el rango REALMENTE cambio (devolver el mismo objeto evita volver a renderizar)
  const alCambiarFechas = useCallback((info: DatesSetArg) => {
    const nuevo = { desde: info.startStr.slice(0, 10), hasta: sumarDias(info.endStr.slice(0, 10), -1) };
    setRango((previo) => (previo && previo.desde === nuevo.desde && previo.hasta === nuevo.hasta ? previo : nuevo));
  }, []);
  const alHacerClicEnCita = useCallback((info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setDetalleId(info.event.id);
  }, []);
  const alHacerClicEnDia = useCallback((info: DateClickArg) => {
    const fecha = info.dateStr.slice(0, 10);
    if (fecha < hoyGuatemala()) return toast.info("No se pueden programar citas en fechas pasadas.");
    setNuevaFecha(fecha);
  }, []);

  const profesionales = useProfesionales(gestion);
  const horarios = useHorarios();

  const estados: EstadoCita[] = mostrarCanceladas ? ESTADOS_CITA : ["PENDIENTE", "CONFIRMADA", "COMPLETADA"];
  const { data, isError, isFetching } = useCitas(
    { desde: rango?.desde, hasta: rango?.hasta, estado: estados, profesionalId: gestion && profesionalId ? profesionalId : undefined, limit: 500 },
    Boolean(rango),
  );
  const eventos = useMemo(() => (data?.items ?? []).map(citaAEvento), [data]);
  // Incluye tambien citas historicas que hayan quedado fuera del horario actual.
  const horasVisibles = useMemo(() => {
    const franjas = (horarios.data?.dias ?? []).filter(d => d.atiende).flatMap(d => d.franjas);
    const inicios = ["07:00", ...franjas.map(f => f.inicio), ...(data?.items ?? []).map(c => c.horaInicio)];
    const fines = ["19:00", ...franjas.map(f => f.fin), ...(data?.items ?? []).map(c => c.horaFin)];
    return { inicio: `${inicios.sort()[0]}:00`, fin: `${fines.sort().at(-1)}:00` };
  }, [horarios.data, data]);

  // Las franjas de atencion configuradas se muestran como "horario laboral": el resto se ve atenuado
  const horarioLaboral = useMemo(
    () => (horarios.data?.dias ?? []).flatMap((d) => (d.atiende ? d.franjas.map((f) => ({ daysOfWeek: [DIA_FC[d.dia]], startTime: f.inicio, endTime: f.fin })) : [])),
    [horarios.data],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <EncabezadoPagina titulo="Calendario" descripcion={rol === "PROFESIONAL" ? "Tu agenda." : gestion ? "Haz clic en un día para programar una cita, o en una cita para verla." : "Agenda de citas."} />

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {gestion && (
          <select aria-label="Filtrar por profesional" value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className={claseControl(false, "w-auto")}>
            <option value="">Todos los profesionales</option>
            {(profesionales.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={mostrarCanceladas} onChange={(e) => setMostrarCanceladas(e.target.checked)} className="size-5 rounded accent-marea-700" />
          Mostrar canceladas
        </label>
        <ul aria-label="Estados de las citas" className="flex flex-wrap gap-2">
          {ESTADOS_CITA.filter((e) => mostrarCanceladas || e !== "CANCELADA").map((e) => <li key={e}><Badge tono={TONO_ESTADO[e]}>{ETIQUETA_ESTADO[e]}</Badge></li>)}
        </ul>
        {isFetching && <span role="status" className="text-sm text-ink-soft">Actualizando…</span>}
      </div>
      {isError && <p role="alert" className="mt-3 text-sm text-danger">No pudimos cargar las citas de este período.</p>}

      <div className="mt-4 rounded-xl border border-marea-100 bg-white p-3 sm:p-4">
        <FullCalendar
          plugins={PLUGINS}
          locales={LOCALES}
          locale="es"
          initialView={vistaInicial}
          headerToolbar={BARRA}
          buttonText={TEXTOS_BOTONES}
          events={eventos}
          businessHours={horarioLaboral}
          slotMinTime={horasVisibles.inicio}
          slotMaxTime={horasVisibles.fin}
          allDaySlot={false}
          nowIndicator
          height="auto"
          expandRows
          firstDay={1}
          eventTimeFormat={FORMATO_HORA}
          slotLabelFormat={FORMATO_HORA}
          dayMaxEvents={4}
          datesSet={alCambiarFechas}
          eventClick={alHacerClicEnCita}
          dateClick={gestion ? alHacerClicEnDia : undefined}
        />
      </div>

      {detalleId && <DetalleCita citaId={detalleId} onCerrar={() => setDetalleId(null)} />}
      <Modal abierto={nuevaFecha !== null} onCerrar={() => setNuevaFecha(null)} ancho="lg" titulo="Programar cita">
        {nuevaFecha !== null && <FormularioCita fechaInicial={nuevaFecha} onCerrar={() => setNuevaFecha(null)} />}
      </Modal>
    </div>
  );
}
