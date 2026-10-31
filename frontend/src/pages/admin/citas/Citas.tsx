import { CalendarPlus, CircleCheck, Eye, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useCambiarEstadoCita, useCitas, useProfesionales, type FiltrosCitas } from "@/api/citas";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { ApiError } from "@/lib/api";
import { ESTADOS_CITA, ETIQUETA_ESTADO, TONO_ESTADO } from "@/lib/citas";
import { hoyGuatemala, textoEdad } from "@/lib/fechas";
import { formatearFechaCorta, formatearHora } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { EstadoCita } from "@/types/api";
import { DetalleCita } from "./DetalleCita";
import { FormularioCita } from "./FormularioCita";

const POR_PAGINA = 20;
type Periodo = "hoy" | "proximos7" | "proximos30" | "pasadas" | "todas";

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "proximos7", etiqueta: "Próximos 7 días" },
  { valor: "proximos30", etiqueta: "Próximos 30 días" },
  { valor: "pasadas", etiqueta: "Últimos 30 días" },
  { valor: "todas", etiqueta: "Todas las fechas" },
];

function rangoDe(periodo: Periodo): Pick<FiltrosCitas, "desde" | "hasta" | "orden"> {
  const hoy = hoyGuatemala();
  const dias = (n: number) => { const d = new Date(`${hoy}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  switch (periodo) {
    case "hoy": return { desde: hoy, hasta: hoy };
    case "proximos7": return { desde: hoy, hasta: dias(7) };
    case "proximos30": return { desde: hoy, hasta: dias(30) };
    case "pasadas": return { desde: dias(-30), hasta: dias(-1), orden: "desc" };
    default: return {};
  }
}

/** «activas» = pendientes y confirmadas (las que ocupan la agenda). */
function estadosDe(estado: string): EstadoCita[] | undefined {
  if (estado === "activas") return ["PENDIENTE", "CONFIRMADA"];
  if (estado === "todos") return undefined;
  return ESTADOS_CITA.includes(estado as EstadoCita) ? [estado as EstadoCita] : undefined;
}

export default function Citas() {
  useDocumentTitle("Citas", "SIGCA");
  const rol = useAuthStore((s) => s.usuario?.rol);
  const gestion = rol === "ADMINISTRADOR" || rol === "RECEPCIONISTA";
  const [params, setParams] = useSearchParams();

  const pacienteId = params.get("paciente") ?? undefined;
  // Con un paciente indicado se muestra todo su historial; sin él, lo que viene en los próximos 30 días.
  const periodo = (params.get("periodo") ?? (pacienteId ? "todas" : "proximos30")) as Periodo;
  const estado = params.get("estado") ?? (pacienteId ? "todos" : "activas");
  const profesionalId = params.get("profesional") ?? undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);

  const cambiarParams = (cambios: Record<string, string | undefined>) =>
    setParams((actual) => {
      const s = new URLSearchParams(actual);
      for (const [k, v] of Object.entries(cambios)) (v ? s.set(k, v) : s.delete(k));
      return s;
    }, { replace: true });

  const rango = rangoDe(periodo);
  const { data, isPending, isError, error, refetch, isFetching } = useCitas({
    ...rango, estado: estadosDe(estado), profesionalId: gestion ? profesionalId : undefined, pacienteId, page, limit: POR_PAGINA,
  });
  const profesionales = useProfesionales(gestion);
  const confirmar = useCambiarEstadoCita();
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);

  const nombreHistorial = pacienteId && data?.items[0] ? `${data.items[0].paciente.nombres} ${data.items[0].paciente.apellidos}` : undefined;

  const confirmarRapido = async (id: string) => {
    try {
      await confirmar.mutateAsync({ id, estado: "CONFIRMADA" });
      toast.exito("Cita confirmada");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos confirmar la cita");
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        titulo={pacienteId ? "Historial de citas" : "Citas"}
        descripcion={pacienteId ? (nombreHistorial ?? "Paciente") : rol === "PROFESIONAL" ? "Tus citas programadas." : "Citas programadas, confirmadas, completadas y canceladas."}
        accion={gestion && (
          <Button onClick={() => setNueva(true)}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            Programar cita
          </Button>
        )}
      />

      {pacienteId && (
        <p className="mt-3 text-sm">
          <button type="button" onClick={() => cambiarParams({ paciente: undefined, periodo: undefined, estado: undefined, page: undefined })}
            className="rounded text-marea-700 underline underline-offset-4 hover:text-marea-900">Ver las citas de todos los pacientes</button>
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <select aria-label="Filtrar por período" value={periodo} onChange={(e) => cambiarParams({ periodo: e.target.value, page: undefined })} className={claseControl(false, "w-auto")}>
          {PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
        </select>
        <select aria-label="Filtrar por estado" value={estado} onChange={(e) => cambiarParams({ estado: e.target.value, page: undefined })} className={claseControl(false, "w-auto")}>
          <option value="activas">Pendientes y confirmadas</option>
          <option value="todos">Todos los estados</option>
          {ESTADOS_CITA.map((e) => <option key={e} value={e}>{ETIQUETA_ESTADO[e]}s</option>)}
        </select>
        {gestion && (
          <select aria-label="Filtrar por profesional" value={profesionalId ?? ""} onChange={(e) => cambiarParams({ profesional: e.target.value || undefined, page: undefined })} className={claseControl(false, "w-auto")}>
            <option value="">Todos los profesionales</option>
            {(profesionales.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {isPending && <Cargando texto="Cargando citas…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}

      {data && data.items.length === 0 && (
        <Vacio titulo="No hay citas con estos filtros">
          <div className="flex flex-col items-center gap-3">
            <span>Prueba con otro período o estado.</span>
            {gestion && <Button variante="contorno" onClick={() => setNueva(true)}>Programar una cita</Button>}
          </div>
        </Vacio>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={`mt-4 overflow-x-auto rounded-xl border border-marea-100 bg-white transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full min-w-[52rem] text-left text-sm">
              <caption className="sr-only">Citas</caption>
              <thead className="border-b border-marea-100 bg-marea-50 text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Fecha y hora</th>
                  <th scope="col" className="px-4 py-3 font-medium">Paciente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Servicio</th>
                  {rol !== "PROFESIONAL" && <th scope="col" className="px-4 py-3 font-medium">Profesional</th>}
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marea-100">
                {data.items.map((c) => (
                  <tr key={c.id} className={c.estado === "CANCELADA" ? "bg-paper text-ink-soft" : undefined}>
                    <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-normal">
                      <p className="font-medium capitalize text-ink">{formatearFechaCorta(c.fecha)}</p>
                      <p className="text-ink-soft">{formatearHora(c.horaInicio)} – {formatearHora(c.horaFin)}</p>
                    </th>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombres={c.paciente.nombres} apellidos={c.paciente.apellidos} url={c.paciente.fotoUrl} tamano="sm" />
                        <div>
                          <p className="font-medium text-ink">{c.paciente.nombres} {c.paciente.apellidos}</p>
                          <p className="text-ink-soft">{textoEdad(c.paciente.edad)}{c.paciente.esMenor && " · menor"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.servicio.nombre}</td>
                    {rol !== "PROFESIONAL" && <td className="px-4 py-3">{c.profesional.nombre}</td>}
                    <td className="px-4 py-3"><Badge tono={TONO_ESTADO[c.estado]}>{ETIQUETA_ESTADO[c.estado]}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {gestion && c.estado === "PENDIENTE" && (
                          <Button variante="texto" aria-label={`Confirmar la cita de ${c.paciente.nombres} ${c.paciente.apellidos}`} title="Confirmar" disabled={confirmar.isPending} onClick={() => void confirmarRapido(c.id)}>
                            <CircleCheck className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                        {gestion && !pacienteId && (
                          <Link to={`?paciente=${c.paciente.id}`} className="grid place-items-center rounded-lg px-4 py-2.5 text-marea-700 hover:bg-marea-50" aria-label={`Historial de ${c.paciente.nombres} ${c.paciente.apellidos}`} title="Historial del paciente">
                            <UserRound className="size-4" aria-hidden="true" />
                          </Link>
                        )}
                        <Button variante="texto" aria-label={`Ver detalle de la cita de ${c.paciente.nombres} ${c.paciente.apellidos} el ${c.fecha} a las ${c.horaInicio}`} title="Ver detalle" onClick={() => setDetalleId(c.id)}>
                          <Eye className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion page={data.page} pages={data.pages} total={data.total} etiqueta="citas" onCambiar={(n) => cambiarParams({ page: n > 1 ? String(n) : undefined })} />
        </>
      )}

      {detalleId && <DetalleCita citaId={detalleId} onCerrar={() => setDetalleId(null)} />}

      <Modal abierto={nueva} onCerrar={() => setNueva(false)} ancho="lg" titulo="Programar cita">
        {nueva && <FormularioCita onCerrar={() => setNueva(false)} />}
      </Modal>
    </div>
  );
}
