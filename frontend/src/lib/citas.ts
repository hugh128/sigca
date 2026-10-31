import type { Badge } from "@/components/ui/Badge";
import type { Cita, EstadoCita, Rol } from "@/types/api";

export const ESTADOS_CITA: EstadoCita[] = ["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA"];

export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export const TONO_ESTADO: Record<EstadoCita, Parameters<typeof Badge>[0]["tono"]> = {
  PENDIENTE: "aviso",
  CONFIRMADA: "info",
  COMPLETADA: "ok",
  CANCELADA: "neutro",
};

/** Colores del calendario (fondo y texto) por estado. */
export const COLOR_ESTADO: Record<EstadoCita, { fondo: string; texto: string; borde: string }> = {
  PENDIENTE: { fondo: "#fcefd2", texto: "#14262a", borde: "#e3a02b" },
  CONFIRMADA: { fondo: "#dcebec", texto: "#0f3d44", borde: "#2f7f86" },
  COMPLETADA: { fondo: "#e3f4ea", texto: "#14262a", borde: "#1f7a4d" },
  CANCELADA: { fondo: "#eef1f1", texto: "#46595d", borde: "#b9c4c6" },
};

export interface AccionesCita {
  confirmar: boolean;
  completar: boolean;
  cancelar: boolean;
  reprogramar: boolean;
}

/**
 * Que puede hacer cada rol con una cita. Es el espejo, para la interfaz, de las reglas del servidor
 * (el servidor es quien manda: aqui solo se decide que botones mostrar).
 *   - Recepcion: confirmar, cancelar y reprogramar (pendientes y confirmadas).
 *   - Profesional: completar SUS citas confirmadas.
 *   - Administrador: todo.
 */
export function accionesDisponibles(estado: EstadoCita, rol: Rol): AccionesCita {
  const activa = estado === "PENDIENTE" || estado === "CONFIRMADA";
  const gestion = rol === "ADMINISTRADOR" || rol === "RECEPCIONISTA";
  return {
    confirmar: gestion && estado === "PENDIENTE",
    completar: (rol === "ADMINISTRADOR" || rol === "PROFESIONAL") && estado === "CONFIRMADA",
    cancelar: gestion && activa,
    reprogramar: gestion && activa,
  };
}

/** Texto para lectores de pantalla y titulos: «Mateo Hernández · Estimulación auditiva verbal». */
export const tituloCita = (c: Pick<Cita, "paciente" | "servicio">) => `${c.paciente.nombres} ${c.paciente.apellidos} · ${c.servicio.nombre}`;

/** Evento de FullCalendar. Se usa la hora de pared tal cual (sin zona) para que se vea igual en cualquier equipo. */
export function citaAEvento(c: Cita) {
  const color = COLOR_ESTADO[c.estado];
  return {
    id: c.id,
    title: `${c.paciente.nombres} ${c.paciente.apellidos}`,
    start: `${c.fecha}T${c.horaInicio}:00`,
    end: `${c.fecha}T${c.horaFin}:00`,
    backgroundColor: color.fondo,
    borderColor: color.borde,
    textColor: color.texto,
    classNames: c.estado === "CANCELADA" ? ["cita-cancelada"] : [],
    extendedProps: { cita: c },
  };
}
