import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { admin, consultasA, filtrarPacientes, filtrarResponsables, pacientePorNombre, pacientesFixture, responsablePorNombre, responsablesFixture } from "@/test/datos";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Responsable } from "@/types/api";
import Responsables from "./Responsables";

const rutas = [
  { path: "/admin/responsables", element: <Responsables /> },
  { path: "/admin/pacientes/:id", element: <p>Ficha del paciente</p> },
];

let responsables: Responsable[];

function iniciar(extra: Parameters<typeof simularApi>[0] = {}) {
  responsables = structuredClone(responsablesFixture);
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  return simularApi({
    "GET /responsables": (_i, url) => ({ body: filtrarResponsables(responsables, url) }),
    "GET /pacientes": (_i, url) => ({ body: filtrarPacientes(pacientesFixture, url) }),
    ...extra,
  });
}

beforeEach(reiniciarEstado);

describe("Responsables", () => {
  it("lista a los responsables con su contacto y los pacientes asociados (enlaces a su ficha)", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/responsables");
    const filaAna = (await screen.findByText("Ana María Morales Cruz")).closest("tr")!;
    expect(within(filaAna).getByText("Madre")).toBeInTheDocument();
    expect(within(filaAna).getByText("ana.morales@sigca.test")).toBeInTheDocument();
    const mateo = within(filaAna).getByRole("link", { name: "Mateo Hernández Morales" });
    expect(mateo).toHaveAttribute("href", `/admin/pacientes/${pacientePorNombre("Mateo").id}`);
    expect(within(filaAna).getByRole("link", { name: "Diego Hernández Morales" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(6); // encabezado + 5
  });

  it("busca por nombre, correo o teléfono sin importar tildes", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/responsables");
    await screen.findByText("Ana María Morales Cruz");
    await user.type(screen.getByLabelText("Buscar responsable"), "perez");
    await waitFor(() => expect(consultasA(api, "GET", "/responsables").some((c) => c.url.searchParams.get("q") === "perez")).toBe(true));
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    expect(screen.getByText("Marta Pérez López")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Buscar responsable"));
    await user.type(screen.getByLabelText("Buscar responsable"), "5555-0103");
    await waitFor(() => expect(screen.getByText("Luis Ortiz Barrios")).toBeInTheDocument());
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("sin resultados permite quitar la búsqueda", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/responsables");
    await screen.findByText("Ana María Morales Cruz");
    await user.type(screen.getByLabelText("Buscar responsable"), "zzzz");
    expect(await screen.findByText("Ningún responsable coincide con la búsqueda")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar búsqueda" }));
    expect(await screen.findByText("Ana María Morales Cruz")).toBeInTheDocument();
  });

  it("registrar: valida teléfono y correo y envía los datos (sin pacientes)", async () => {
    const api = iniciar({
      "POST /responsables": (init) => {
        const nuevo = { ...JSON.parse(String(init?.body)), id: "r-nuevo", pacientes: [] };
        responsables.push(nuevo);
        return { status: 201, body: nuevo };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/responsables");
    await user.click(await screen.findByRole("button", { name: "Nuevo responsable" }));
    const modal = await screen.findByRole("dialog", { name: "Nuevo responsable" });

    await user.type(within(modal).getByLabelText("Nombres"), "Gloria");
    await user.type(within(modal).getByLabelText("Apellidos"), "Ramírez");
    await user.type(within(modal).getByLabelText("Parentesco"), "Tía");
    await user.type(within(modal).getByLabelText("Teléfono"), "abc");
    await user.type(within(modal).getByLabelText("Correo electrónico"), "gloria@");
    await user.type(within(modal).getByLabelText("Dirección"), "Zona 7, Ciudad de Guatemala");
    await user.click(within(modal).getByRole("button", { name: "Registrar responsable" }));
    expect(await within(modal).findByText(/Teléfono inválido/)).toBeInTheDocument();
    expect(within(modal).getByText(/Escribe un correo válido/)).toBeInTheDocument();
    expect(consultasA(api, "POST", "/responsables")).toHaveLength(0);

    await user.clear(within(modal).getByLabelText("Teléfono"));
    await user.type(within(modal).getByLabelText("Teléfono"), "5555-4321");
    await user.clear(within(modal).getByLabelText("Correo electrónico"));
    await user.type(within(modal).getByLabelText("Correo electrónico"), "gloria@sigca.test");
    await user.click(within(modal).getByRole("button", { name: "Registrar responsable" }));

    expect(await screen.findByText("Responsable registrado")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "POST", "/responsables")[0]!.init!.body))).toEqual({
      nombres: "Gloria", apellidos: "Ramírez", parentesco: "Tía", telefono: "5555-4321", email: "gloria@sigca.test",
      direccion: "Zona 7, Ciudad de Guatemala", fotoUrl: "", fotoKey: "", pacientes: [],
    });
    expect(await screen.findByText("Gloria Ramírez")).toBeInTheDocument(); // la lista se refresca
  });

  it("editar: carga los datos y envía los cambios", async () => {
    const ana = responsablePorNombre("Ana María");
    const api = iniciar({ [`PUT /responsables/${ana.id}`]: (init) => ({ body: { ...ana, ...JSON.parse(String(init?.body)) } }) });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/responsables");
    await user.click(await screen.findByRole("button", { name: "Editar a Ana María Morales Cruz" }));
    const modal = await screen.findByRole("dialog", { name: "Editar responsable" });
    expect(within(modal).getByLabelText("Parentesco")).toHaveValue("Madre");
    await user.clear(within(modal).getByLabelText("Teléfono"));
    await user.type(within(modal).getByLabelText("Teléfono"), "5555-0000");
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PUT", `/responsables/${ana.id}`)[0]!.init!.body))).toMatchObject({ telefono: "5555-0000", nombres: "Ana María" });
  });

  it("gestionar pacientes: ver, quitar y asociar otro", async () => {
    const ana = responsablePorNombre("Ana María");
    const mateo = pacientePorNombre("Mateo");
    const lucia = pacientePorNombre("Lucía");
    const api = iniciar({
      [`DELETE /responsables/${ana.id}/pacientes/${mateo.id}`]: () => {
        responsables = responsables.map((r) => (r.id === ana.id ? { ...r, pacientes: r.pacientes.filter((p) => p.id !== mateo.id) } : r));
        return { body: responsables.find((r) => r.id === ana.id) };
      },
      [`POST /responsables/${ana.id}/pacientes`]: (init) => {
        const { pacienteId } = JSON.parse(String(init?.body));
        const p = pacientesFixture.find((x) => x.id === pacienteId)!;
        responsables = responsables.map((r) => (r.id === ana.id ? { ...r, pacientes: [...r.pacientes, { id: p.id, nombres: p.nombres, apellidos: p.apellidos, estado: p.estado }] } : r));
        return { body: responsables.find((r) => r.id === ana.id) };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/responsables");
    await user.click(await screen.findByRole("button", { name: "Gestionar pacientes de Ana María Morales Cruz" }));
    const modal = await screen.findByRole("dialog", { name: "Pacientes del responsable" });
    const asociados = within(modal).getByRole("region", { name: "Pacientes asociados" });
    expect(within(asociados).getByText("Mateo Hernández Morales")).toBeInTheDocument();
    expect(within(asociados).getByText("Diego Hernández Morales")).toBeInTheDocument();

    // quitar a Mateo
    await user.click(within(asociados).getByRole("button", { name: "Quitar a Mateo Hernández Morales" }));
    expect(await screen.findByText(/Mateo ya no está asociado a Ana María/)).toBeInTheDocument();
    await waitFor(() => expect(within(asociados).queryByText("Mateo Hernández Morales")).not.toBeInTheDocument());
    expect(consultasA(api, "DELETE", `/responsables/${ana.id}/pacientes/${mateo.id}`)).toHaveLength(1);

    // asociar a Lucía (menor sin responsable)
    await user.type(within(modal).getByLabelText("Buscar paciente"), "lucia");
    await user.click(await within(modal).findByRole("button", { name: "Asociar: Lucía Gómez Alvarado" }));
    expect(await screen.findByText(/Ana María ahora es responsable de Lucía Gómez Alvarado/)).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "POST", `/responsables/${ana.id}/pacientes`)[0]!.init!.body))).toEqual({ pacienteId: lucia.id });
    await waitFor(() => expect(within(asociados).getByText("Lucía Gómez Alvarado")).toBeInTheDocument());
  });

  it("en la búsqueda no ofrece asociar a un paciente que ya está asociado", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/responsables");
    await user.click(await screen.findByRole("button", { name: "Gestionar pacientes de Ana María Morales Cruz" }));
    const modal = await screen.findByRole("dialog");
    await user.type(within(modal).getByLabelText("Buscar paciente"), "diego");
    const fila = (await within(modal).findAllByText("Diego Hernández Morales")).map((e) => e.closest("li")!).find((li) => li.textContent?.includes("Ya asociado"));
    expect(fila).toBeDefined();
    expect(within(fila!).queryByRole("button", { name: /Asociar/ })).not.toBeInTheDocument();
  });
});
