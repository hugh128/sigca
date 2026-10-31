import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { renderConRutas, reiniciarEstado } from "@/test/utils";
import type { Usuario } from "@/types/api";
import { GuestOnly, RequireAuth, RequireRole } from "./guards";

const usuario = (rol: Usuario["rol"]): Usuario => ({ id: "1", nombre: "Ana Prueba", email: "a@b.test", rol, activo: true, createdAt: "", updatedAt: "" });

const rutas = [
  { path: "admin/login", element: <GuestOnly />, children: [{ index: true, element: <p>Pantalla de login</p> }] },
  {
    path: "admin",
    element: <RequireAuth />,
    children: [
      { index: true, element: <p>Panel</p> },
      { path: "usuarios", element: <RequireRole roles={["ADMINISTRADOR"]} />, children: [{ index: true, element: <p>Gestión de usuarios</p> }] },
    ],
  },
];

beforeEach(reiniciarEstado);

describe("guards de rutas", () => {
  it("un visitante que entra a /admin es enviado al login", async () => {
    renderConRutas(rutas, "/admin");
    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument();
  });

  it("con sesion, /admin muestra el panel", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: usuario("RECEPCIONISTA") });
    renderConRutas(rutas, "/admin");
    expect(await screen.findByText("Panel")).toBeInTheDocument();
  });

  it("mientras se verifica el token guardado muestra una pantalla de carga (no redirige)", () => {
    useAuthStore.setState({ token: "t", estado: "cargando" });
    renderConRutas(rutas, "/admin");
    expect(screen.getByText("Verificando tu sesión…")).toBeInTheDocument();
    expect(screen.queryByText("Pantalla de login")).not.toBeInTheDocument();
  });

  it("un rol sin permiso ve 'No tienes acceso' en un modulo restringido", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: usuario("PROFESIONAL") });
    renderConRutas(rutas, "/admin/usuarios");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
    expect(screen.queryByText("Gestión de usuarios")).not.toBeInTheDocument();
  });

  it("el administrador si entra al modulo restringido", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: usuario("ADMINISTRADOR") });
    renderConRutas(rutas, "/admin/usuarios");
    expect(await screen.findByText("Gestión de usuarios")).toBeInTheDocument();
  });

  it("con sesion, el login redirige al panel", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: usuario("ADMINISTRADOR") });
    renderConRutas(rutas, "/admin/login");
    expect(await screen.findByText("Panel")).toBeInTheDocument();
  });
});
