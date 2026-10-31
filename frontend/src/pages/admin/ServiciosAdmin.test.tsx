import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import serviciosFixture from "@/test/fixtures/servicios-admin.json";
import usuariosFixture from "@/test/fixtures/usuarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Servicio, Usuario } from "@/types/api";
import ServiciosAdmin from "./ServiciosAdmin";

const rutas = [{ path: "/admin/servicios", element: <ServiciosAdmin /> }];
const usuarioConRol = (rol: Usuario["rol"]) => usuariosFixture.find((u) => u.rol === rol) as Usuario;
const atencion = serviciosFixture.find((s) => s.nombre === "Atención psicológica") as Servicio;

let servicios: Servicio[];

function iniciar(rol: Usuario["rol"] = "ADMINISTRADOR", extra: Parameters<typeof simularApi>[0] = {}) {
  servicios = structuredClone(serviciosFixture) as Servicio[];
  useAuthStore.setState({ estado: "autenticado", usuario: usuarioConRol(rol), token: "t" });
  return simularApi({ "GET /servicios": () => ({ body: servicios }), ...extra });
}

const llamadas = (api: ReturnType<typeof simularApi>, metodo: string, ruta: string) =>
  api.mock.calls.filter(([u, i]) => String(u).endsWith(ruta) && (i?.method ?? "GET") === metodo);

beforeEach(reiniciarEstado);

describe("Servicios (panel)", () => {
  it("el administrador ve precios en quetzales, duración y acciones", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/servicios");
    const fila = (await screen.findByText("Atención psicológica")).closest("tr")!;
    expect(within(fila).getByText(/250[.,]00/)).toBeInTheDocument();
    expect(within(fila).getByText("50 min")).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: "Editar Atención psicológica" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo servicio" })).toBeInTheDocument();
  });

  it("la recepcionista solo consulta: ve precios pero no hay acciones de edición", async () => {
    iniciar("RECEPCIONISTA");
    renderConRutas(rutas, "/admin/servicios");
    await screen.findByText("Atención psicológica");
    expect(screen.getAllByText(/\d+[.,]00/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Nuevo servicio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar / })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();
  });

  it("crear: valida duración y precio", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/servicios");
    await user.click(await screen.findByRole("button", { name: "Nuevo servicio" }));
    const modal = await screen.findByRole("dialog", { name: "Nuevo servicio" });

    await user.type(within(modal).getByLabelText("Nombre del servicio"), "Taller");
    await user.type(within(modal).getByLabelText("Descripción"), "Descripción");
    await user.type(within(modal).getByLabelText("Duración (minutos)"), "2");
    await user.type(within(modal).getByLabelText("Precio"), "12.345");
    await user.click(within(modal).getByRole("button", { name: "Crear servicio" }));

    expect(await within(modal).findByText("La duración mínima es de 5 minutos")).toBeInTheDocument();
    expect(within(modal).getByText("Escribe un monto válido, por ejemplo 250 o 250.50")).toBeInTheDocument();
    expect(llamadas(api, "POST", "/servicios")).toHaveLength(0);
  });

  it("crear: convierte quetzales a centavos y minutos a número antes de enviar", async () => {
    const api = iniciar("ADMINISTRADOR", {
      "POST /servicios": (init) => {
        const nuevo = { ...JSON.parse(String(init?.body)), id: "s-nuevo", estado: "ACTIVO" };
        servicios.push(nuevo);
        return { status: 201, body: nuevo };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/servicios");
    await user.click(await screen.findByRole("button", { name: "Nuevo servicio" }));
    const modal = await screen.findByRole("dialog");

    await user.type(within(modal).getByLabelText("Nombre del servicio"), " Taller de lectura ");
    await user.type(within(modal).getByLabelText("Descripción"), "Refuerzo de lectura");
    await user.type(within(modal).getByLabelText("Duración (minutos)"), "45");
    await user.type(within(modal).getByLabelText("Precio"), "19.99");
    await user.click(within(modal).getByRole("button", { name: "Crear servicio" }));

    expect(await screen.findByText("Servicio creado")).toBeInTheDocument();
    expect(JSON.parse(String(llamadas(api, "POST", "/servicios")[0]![1]!.body))).toEqual({
      nombre: "Taller de lectura", descripcion: "Refuerzo de lectura", duracionMin: 45, precioCentavos: 1999, imagenUrl: "", imagenKey: "",
    });
    expect(await screen.findByText("Taller de lectura")).toBeInTheDocument();
  });

  it("editar: muestra el precio en quetzales y envía el nuevo en centavos", async () => {
    const api = iniciar("ADMINISTRADOR", {
      [`PUT /servicios/${atencion.id}`]: (init) => ({ body: { ...atencion, ...JSON.parse(String(init?.body)) } }),
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/servicios");
    await user.click(await screen.findByRole("button", { name: "Editar Atención psicológica" }));
    const modal = await screen.findByRole("dialog", { name: "Editar servicio" });

    expect(within(modal).getByLabelText("Precio")).toHaveValue("250.00");
    expect(within(modal).getByLabelText("Duración (minutos)")).toHaveValue("50");

    await user.clear(within(modal).getByLabelText("Precio"));
    await user.type(within(modal).getByLabelText("Precio"), "275.50");
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Servicio actualizado")).toBeInTheDocument();
    const cuerpo = JSON.parse(String(llamadas(api, "PUT", `/servicios/${atencion.id}`)[0]![1]!.body));
    expect(cuerpo.precioCentavos).toBe(27550);
    expect(cuerpo.duracionMin).toBe(50);
    expect(cuerpo.nombre).toBe("Atención psicológica");
  });

  it("un error del servidor sobre el precio se muestra bajo el campo precio", async () => {
    iniciar("ADMINISTRADOR", {
      [`PUT /servicios/${atencion.id}`]: { status: 400, body: { message: "Datos inválidos", errors: [{ campo: "precioCentavos", mensaje: "Precio fuera de rango" }] } },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/servicios");
    await user.click(await screen.findByRole("button", { name: "Editar Atención psicológica" }));
    const modal = await screen.findByRole("dialog");
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));
    expect(await within(modal).findByText("Precio fuera de rango")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Precio")).toHaveAttribute("aria-invalid", "true");
  });

  it("desactivar pide confirmación y activar es directo", async () => {
    const api = iniciar("ADMINISTRADOR", {
      [`PATCH /servicios/${atencion.id}/estado`]: (init) => {
        const estado = JSON.parse(String(init?.body)).estado;
        servicios = servicios.map((s) => (s.id === atencion.id ? { ...s, estado } : s));
        return { body: { ...atencion, estado } };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/servicios");

    await user.click(await screen.findByRole("button", { name: "Desactivar Atención psicológica" }));
    const confirmacion = await screen.findByRole("dialog");
    expect(within(confirmacion).getByText(/Dejará de mostrarse en el portal/)).toBeInTheDocument();
    await user.click(within(confirmacion).getByRole("button", { name: "Desactivar servicio" }));

    expect(await screen.findByText("«Atención psicológica» fue desactivado")).toBeInTheDocument();
    expect(JSON.parse(String(llamadas(api, "PATCH", `/servicios/${atencion.id}/estado`)[0]![1]!.body))).toEqual({ estado: "INACTIVO" });

    await user.click(await screen.findByRole("button", { name: "Activar Atención psicológica" }));
    await waitFor(() => expect(llamadas(api, "PATCH", `/servicios/${atencion.id}/estado`)).toHaveLength(2));
    expect(JSON.parse(String(llamadas(api, "PATCH", `/servicios/${atencion.id}/estado`)[1]![1]!.body))).toEqual({ estado: "ACTIVO" });
  });

  it("filtra por texto (sin tildes) y por estado", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/servicios");
    await screen.findByText("Atención psicológica");
    await user.type(screen.getByLabelText("Buscar servicio"), "evaluacion");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.clear(screen.getByLabelText("Buscar servicio"));
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "inactivos");
    expect(screen.getByText("Ningún servicio coincide con los filtros")).toBeInTheDocument();
  });
});
