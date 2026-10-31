import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import contenido from "@/test/fixtures/contenido.json";
import serviciosAdmin from "@/test/fixtures/servicios-admin.json";
import usuarios from "@/test/fixtures/usuarios.json";
import horarios from "@/test/fixtures/horarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Usuario } from "@/types/api";
import { rutas } from "./router";

const conRol = (rol: Usuario["rol"]) => usuarios.find((u) => u.rol === rol) as Usuario;

beforeEach(() => {
  reiniciarEstado();
  simularApi({
    "GET /contenido": { body: contenido },
    "GET /usuarios": { body: usuarios },
    "GET /servicios": { body: serviciosAdmin },
    "GET /horarios": { body: horarios },
  });
});

function entrarComo(rol: Usuario["rol"], ruta: string) {
  useAuthStore.setState({ estado: "autenticado", usuario: conRol(rol), token: "t" });
  return renderConRutas(rutas, ruta);
}

describe("permisos por rol (router real)", () => {
  it("recepción puede consultar horarios por URL sin editar", async () => {
    entrarComo("RECEPCIONISTA", "/admin/horarios");
    expect(await screen.findByText("Lunes a viernes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar horarios" })).not.toBeInTheDocument();
  });
  it("recepción no puede consultar materiales por URL", async () => {
    entrarComo("RECEPCIONISTA", "/admin/materiales");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
  });
  it("el profesional no puede gestionar solicitudes por URL", async () => {
    entrarComo("PROFESIONAL", "/admin/solicitudes");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
  });
  it.each(["RECEPCIONISTA", "PROFESIONAL"] as const)("%s no puede abrir mensajes por URL", async rol => {
    entrarComo(rol, "/admin/mensajes");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
  });
  it("el administrador ve el menú completo, incluidas las citas", async () => {
    entrarComo("ADMINISTRADOR", "/admin");
    const menu = (await screen.findAllByRole("navigation", { name: "Módulos" }))[0]!;
    expect(within(menu).getByRole("link", { name: "Panel" })).toBeInTheDocument();
    for (const nombre of ["Calendario", "Citas", "Solicitudes", "Pacientes", "Responsables", "Servicios", "Horarios", "Contenido", "Usuarios", "Mensajes"]) {
      expect(within(menu).getByRole("link", { name: nombre })).toBeInTheDocument();
    }
    expect(within(menu).queryByRole("link", { name: "Mis pacientes" })).not.toBeInTheDocument(); // es solo para profesionales
  });

  it("recepción consulta servicios y horarios, sin administración de usuarios ni contenido", async () => {
    entrarComo("RECEPCIONISTA", "/admin");
    const menu = (await screen.findAllByRole("navigation", { name: "Módulos" }))[0]!;
    for (const nombre of ["Calendario", "Citas", "Solicitudes", "Pacientes", "Responsables", "Servicios", "Horarios"]) expect(within(menu).getByRole("link", { name: nombre })).toBeInTheDocument();
    for (const nombre of ["Usuarios", "Contenido", "Mis pacientes", "Mensajes", "Materiales"]) expect(within(menu).queryByRole("link", { name: nombre })).not.toBeInTheDocument();
  });

  it("el profesional no puede abrir pacientes ni responsables escribiendo la dirección", async () => {
    entrarComo("PROFESIONAL", "/admin/pacientes");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
  });

  it("el profesional ve Panel, Calendario, Citas y Mis pacientes (y nada más)", async () => {
    entrarComo("PROFESIONAL", "/admin");
    const menu = (await screen.findAllByRole("navigation", { name: "Módulos" }))[0]!;
    expect(within(menu).getAllByRole("link").map((l) => l.textContent)).toEqual(["Panel", "Calendario", "Citas", "Mis pacientes", "Materiales"]);
  });

  it("escribir /admin/usuarios en la barra como recepcionista muestra 'No tienes acceso'", async () => {
    entrarComo("RECEPCIONISTA", "/admin/usuarios");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("escribir /admin/servicios como profesional muestra 'No tienes acceso'", async () => {
    entrarComo("PROFESIONAL", "/admin/servicios");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
  });

  it("el administrador entra a /admin/usuarios", async () => {
    entrarComo("ADMINISTRADOR", "/admin/usuarios");
    expect(await screen.findByRole("heading", { name: "Usuarios" })).toBeInTheDocument();
  });
});
