import { CalendarCheck, CalendarClock, CalendarDays, ClipboardList, FileText, LayoutDashboard, Mail, UserRound, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { Rol } from "@/types/api";

export interface ItemNav {
  to: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Roles que ven este modulo. */
  roles: Rol[];
  end?: boolean;
}

const TODOS: Rol[] = ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"];

/**
 * Menu lateral del sistema administrativo. Cada modulo nuevo se agrega aqui con los roles
 * que pueden verlo (la autorizacion real sigue verificandose en el backend).
 */
export const NAV_ADMIN: ItemNav[] = [
  { to: "/admin", etiqueta: "Panel", icono: LayoutDashboard, roles: TODOS, end: true },
  { to: "/admin/calendario", etiqueta: "Calendario", icono: CalendarDays, roles: TODOS },
  { to: "/admin/citas", etiqueta: "Citas", icono: CalendarCheck, roles: TODOS },
  { to: "/admin/solicitudes", etiqueta: "Solicitudes", icono: ClipboardList, roles: ["ADMINISTRADOR", "RECEPCIONISTA"] },
  { to: "/admin/mis-pacientes", etiqueta: "Mis pacientes", icono: UserRound, roles: ["PROFESIONAL"] },
  { to: "/admin/pacientes", etiqueta: "Pacientes", icono: UserRound, roles: ["ADMINISTRADOR", "RECEPCIONISTA"] },
  { to: "/admin/responsables", etiqueta: "Responsables", icono: UsersRound, roles: ["ADMINISTRADOR", "RECEPCIONISTA"] },
  { to: "/admin/servicios", etiqueta: "Servicios", icono: ClipboardList, roles: ["ADMINISTRADOR", "RECEPCIONISTA"] },
  { to: "/admin/horarios", etiqueta: "Horarios", icono: CalendarClock, roles: ["ADMINISTRADOR"] },
  { to: "/admin/contenido", etiqueta: "Contenido", icono: FileText, roles: ["ADMINISTRADOR"] },
  { to: "/admin/mensajes", etiqueta: "Mensajes", icono: Mail, roles: ["ADMINISTRADOR"] },
  { to: "/admin/usuarios", etiqueta: "Usuarios", icono: Users, roles: ["ADMINISTRADOR"] },
];
