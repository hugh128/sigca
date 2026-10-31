import { createBrowserRouter, type RouteObject } from "react-router";
import { PublicLayout } from "@/layouts/PublicLayout";
import NoEncontrada from "@/pages/NoEncontrada";
import { Cargando } from "@/components/ui/Estados";
import Corporativo from "@/pages/public/Corporativo";
import Educativo from "@/pages/public/Educativo";
import Horarios from "@/pages/public/Horarios";
import Inicio from "@/pages/public/Inicio";
import MisionVision from "@/pages/public/MisionVision";
import Servicios from "@/pages/public/Servicios";
import { GuestOnly, RequireAuth, RequireRole } from "./guards";

// El sistema administrativo se descarga solo cuando alguien entra a /admin (el portal publico pesa menos).
/** Se muestra mientras se descarga el codigo del panel (carga diferida). */
const PantallaCarga = () => (
  <div className="grid min-h-screen place-items-center">
    <Cargando />
  </div>
);

const adminLayout = async () => ({ Component: (await import("@/layouts/AdminLayout")).AdminLayout });
const login = async () => ({ Component: (await import("@/pages/admin/Login")).default });
const panel = async () => ({ Component: (await import("@/pages/admin/Panel")).default });
const usuarios = async () => ({ Component: (await import("@/pages/admin/Usuarios")).default });
const servicios = async () => ({ Component: (await import("@/pages/admin/ServiciosAdmin")).default });
const contenido = async () => ({ Component: (await import("@/pages/admin/Contenido")).default });
const horariosAdmin = async () => ({ Component: (await import("@/pages/admin/HorariosAdmin")).default });
const pacientes = async () => ({ Component: (await import("@/pages/admin/pacientes/Pacientes")).default });
const pacienteDetalle = async () => ({ Component: (await import("@/pages/admin/pacientes/PacienteDetalle")).default });
const responsables = async () => ({ Component: (await import("@/pages/admin/responsables/Responsables")).default });
const calendario = async () => ({ Component: (await import("@/pages/admin/citas/Calendario")).default });
const citasPagina = async () => ({ Component: (await import("@/pages/admin/citas/Citas")).default });
const misPacientes = async () => ({ Component: (await import("@/pages/admin/pacientes/MisPacientes")).default });
const mensajes = async () => ({ Component: (await import("@/pages/admin/Mensajes")).default });
const contacto = async () => ({ Component: (await import("@/pages/public/Contacto")).default });
const solicitarCita = async () => ({ Component: (await import("@/pages/public/SolicitarCita")).default });
const solicitudes = async () => ({ Component: (await import("@/pages/admin/Solicitudes")).default });
const prohibido = async () => ({ Component: (await import("@/pages/admin/Prohibido")).default });

/**
 * Para agregar un modulo administrativo:
 *   1. crear su pagina en pages/admin
 *   2. registrarla aqui dentro de AdminLayout (envuelta en <RequireRole roles={[...]}> si no es para todos)
 *   3. agregarla a config/adminNav.ts
 */
export const rutas: RouteObject[] = [
  {
    element: <PublicLayout />,
    HydrateFallback: PantallaCarga,
    children: [
      { index: true, element: <Inicio /> },
      { path: "mision-vision", element: <MisionVision /> },
      { path: "servicios", element: <Servicios /> },
      { path: "contenido-educativo", element: <Educativo /> },
      { path: "corporativo", element: <Corporativo /> },
      { path: "horarios", element: <Horarios /> },
      { path: "contacto", lazy: contacto },
      { path: "solicitar-cita", lazy: solicitarCita },
    ],
  },
  {
    element: <GuestOnly />,
    HydrateFallback: PantallaCarga,
    children: [{ path: "admin/login", lazy: login }],
  },
  {
    path: "admin",
    element: <RequireAuth />,
    HydrateFallback: PantallaCarga,
    children: [
      {
        lazy: adminLayout,
        children: [
          { index: true, lazy: panel },
          {
            path: "mensajes",
            element: <RequireRole roles={["ADMINISTRADOR"]} />,
            children: [{ index: true, lazy: mensajes }],
          },
          {
            path: "usuarios",
            element: <RequireRole roles={["ADMINISTRADOR"]} />,
            children: [{ index: true, lazy: usuarios }],
          },
          {
            path: "contenido",
            element: <RequireRole roles={["ADMINISTRADOR"]} />,
            children: [{ index: true, lazy: contenido }],
          },
          {
            path: "horarios",
            element: <RequireRole roles={["ADMINISTRADOR"]} />,
            children: [{ index: true, lazy: horariosAdmin }],
          },
          { path: "calendario", lazy: calendario },
          { path: "citas", lazy: citasPagina },
          {
            path: "solicitudes",
            element: <RequireRole roles={["ADMINISTRADOR", "RECEPCIONISTA"]} />,
            children: [{ index: true, lazy: solicitudes }],
          },
          {
            path: "mis-pacientes",
            element: <RequireRole roles={["PROFESIONAL"]} />,
            children: [{ index: true, lazy: misPacientes }],
          },
          {
            path: "pacientes",
            element: <RequireRole roles={["ADMINISTRADOR", "RECEPCIONISTA"]} />,
            children: [
              { index: true, lazy: pacientes },
              { path: ":id", lazy: pacienteDetalle },
            ],
          },
          {
            path: "responsables",
            element: <RequireRole roles={["ADMINISTRADOR", "RECEPCIONISTA"]} />,
            children: [{ index: true, lazy: responsables }],
          },
          {
            path: "servicios",
            element: <RequireRole roles={["ADMINISTRADOR", "RECEPCIONISTA"]} />,
            children: [{ index: true, lazy: servicios }],
          },
          { path: "*", lazy: prohibido },
        ],
      },
    ],
  },
  { path: "*", element: <NoEncontrada /> },
];

export const router = createBrowserRouter(rutas);
