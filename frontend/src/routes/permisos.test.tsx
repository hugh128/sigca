import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import contenido from "@/test/fixtures/contenido.json";
import serviciosAdmin from "@/test/fixtures/servicios-admin.json";
import usuarios from "@/test/fixtures/usuarios.json";
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
  });
});

function entrarComo(rol: Usuario["rol"], ruta: string) {
  useAuthStore.setState({ estado: "autenticado", usuario: conRol(rol), token: "t" });
  return renderConRutas(rutas, ruta);
}

describe("permisos por rol (router real)", () => {
  it("el administrador ve Panel, Servicios y Usuarios en el menú", async () => {
    entrarComo("ADMINISTRADOR", "/admin");
    const menu = (await screen.findAllByRole("navigation", { name: "Módulos" }))[0]!;
    expect(within(menu).getByRole("link", { name: "Panel" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Servicios" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
  });

  it("la recepcionista ve Pacientes, Responsables y Servicios, pero no Usuarios, Contenido ni Horarios", async () => {
    entrarComo("RECEPCIONISTA", "/admin");
    const menu = (await screen.findAllByRole("navigation", { name: "Módulos" }))[0]!;
    for (const nombre of ["Pacientes", "Responsables", "Servicios"]) expect(within(menu).getByRole("link", { name: nombre })).toBeInTheDocument();
    for (const nombre of ["Usuarios", "Contenido", "Horarios"]) expect(within(menu).queryByRole("link", { name: nombre })).not.toBeInTheDocument();
  });

  it("el profesional no puede abrir pacientes ni responsables escribiendo la dirección", async () => {
    entrarComo("PROFESIONAL", "/admin/pacientes");
    expect(await screen.findByText("No tienes acceso a esta sección")).toBeInTheDocument();
  });

  it("el profesional solo ve el Panel", async () => {
    entrarComo("PROFESIONAL", "/admin");
    const menu = (await screen.findAllByRole("navigation", { name: "Módulos" }))[0]!;
    expect(within(menu).getAllByRole("link")).toHaveLength(1);
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
