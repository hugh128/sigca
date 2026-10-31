import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { hoyGuatemala } from "@/lib/fechas";
import { useAuthStore } from "@/store/auth";
import { admin, consultasA, filtrarResponsables, pacientePorNombre, responsablePorNombre, responsablesFixture } from "@/test/datos";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Paciente, ResponsableDePaciente } from "@/types/api";
import PacienteDetalle from "./PacienteDetalle";

const rutas = [
  { path: "/admin/pacientes", element: <p>Listado de pacientes</p> },
  { path: "/admin/pacientes/:id", element: <PacienteDetalle /> },
];

let paciente: Paciente;

function iniciar(nombre: string, extra: Parameters<typeof simularApi>[0] = {}) {
  paciente = structuredClone(pacientePorNombre(nombre));
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  const quitarDe = (rid: string) => { paciente.responsables = paciente.responsables.filter((r) => r.id !== rid); };
  return simularApi({
    [`GET /pacientes/${paciente.id}`]: () => ({ body: paciente }),
    "GET /responsables": (_i, url) => ({ body: filtrarResponsables(responsablesFixture, url) }),
    [`POST /pacientes/${paciente.id}/responsables`]: (init) => {
      const { responsableId } = JSON.parse(String(init?.body));
      const { pacientes: _p, ...r } = responsablePorNombre(responsablesFixture.find((x) => x.id === responsableId)!.nombres);
      paciente.responsables = [...paciente.responsables, r as ResponsableDePaciente];
      return { body: paciente };
    },
    ...Object.fromEntries(paciente.responsables.map((r) => [`DELETE /pacientes/${paciente.id}/responsables/${r.id}`, () => { quitarDe(r.id); return { body: paciente }; }])),
    ...extra,
  });
}
const abrir = () => renderConRutas(rutas, `/admin/pacientes/${paciente.id}`);

beforeEach(reiniciarEstado);

describe("Ficha del paciente", () => {
  it("muestra los datos, la edad y los responsables con sus contactos", async () => {
    iniciar("Sebastián");
    abrir();
    expect(await screen.findByRole("heading", { level: 1, name: "Sebastián Pérez Gómez" })).toBeInTheDocument();
    expect(screen.getByText(/17 años · menor de edad/)).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    const datos = screen.getByRole("region", { name: "Datos del paciente" });
    expect(within(datos).getByText(/Boulevard Los Próceres/)).toBeInTheDocument();
    expect(within(datos).getByText(/Masculino/)).toBeInTheDocument();

    const lista = screen.getByRole("region", { name: "Responsables" });
    expect(within(lista).getByText(/Marta Pérez López/)).toBeInTheDocument();
    expect(within(lista).getByText(/Madre/)).toBeInTheDocument();
    expect(within(lista).getByText(/Rosa Gómez Alvarado/)).toBeInTheDocument();
    expect(within(lista).getByText(/marta\.perez@sigca\.test/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RN-04: un menor sin responsable muestra una alerta clara", async () => {
    iniciar("Lucía");
    abrir();
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Lucía es menor de edad y todavía no tiene un responsable");
    expect(alerta).toHaveTextContent("antes de poder programar citas");
    expect(screen.getByText("Aún no hay responsables registrados.")).toBeInTheDocument();
  });

  it("un adulto sin responsable no genera alerta", async () => {
    iniciar("Jorge");
    abrir();
    expect(await screen.findByRole("heading", { level: 1, name: /Jorge Alvarado/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/no necesitan responsable/)).toBeInTheDocument();
  });

  it("un paciente inexistente muestra el error del servidor", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    simularApi({ "GET /pacientes/aaaaaaaaaaaaaaaaaaaaaaaa": { status: 404, body: { message: "Paciente no encontrado" } } });
    renderConRutas(rutas, "/admin/pacientes/aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(await screen.findByRole("alert")).toHaveTextContent("Paciente no encontrado");
  });

  it("asociar un responsable existente: busca, no ofrece a los ya asociados y asocia", async () => {
    const api = iniciar("Mateo"); // ya tiene a Ana María
    const user = userEvent.setup();
    abrir();
    await screen.findByRole("heading", { level: 1, name: /Mateo/ });
    await user.click(screen.getByRole("button", { name: "Asociar existente" }));
    const modal = await screen.findByRole("dialog", { name: "Asociar un responsable existente" });

    // sin escribir nada ya hay resultados; Ana María figura como ya asociada
    expect(await within(modal).findByText("Luis Ortiz Barrios")).toBeInTheDocument();
    const filaAna = within(modal).getByText("Ana María Morales Cruz").closest("li")!;
    expect(within(filaAna).getByText("Ya asociado")).toBeInTheDocument();
    expect(within(filaAna).queryByRole("button")).not.toBeInTheDocument();

    // la búsqueda ignora tildes
    await user.type(within(modal).getByLabelText("Buscar responsable"), "perez");
    await waitFor(() => expect(consultasA(api, "GET", "/responsables").some((c) => c.url.searchParams.get("q") === "perez")).toBe(true));
    await waitFor(() => expect(within(modal).queryByText("Luis Ortiz Barrios")).not.toBeInTheDocument());
    expect(within(modal).getByText("Marta Pérez López")).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: "Asociar: Marta Pérez López" }));
    expect(await screen.findByText("Marta Pérez López ahora es responsable de Mateo")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "POST", `/pacientes/${paciente.id}/responsables`)[0]!.init!.body))).toEqual({ responsableId: responsablePorNombre("Marta").id });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const lista = screen.getByRole("region", { name: "Responsables" });
    expect(await within(lista).findByText(/Marta Pérez López/)).toBeInTheDocument();
  });

  it("si no hay coincidencias ofrece registrar un responsable nuevo", async () => {
    iniciar("Mateo");
    const user = userEvent.setup();
    abrir();
    await user.click(await screen.findByRole("button", { name: "Asociar existente" }));
    const modal = await screen.findByRole("dialog");
    await user.type(within(modal).getByLabelText("Buscar responsable"), "zzzz");
    expect(await within(modal).findByText(/No hay coincidencias/)).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "registrar un responsable nuevo" }));
    expect(await screen.findByRole("dialog", { name: "Registrar responsable" })).toBeInTheDocument();
  });

  it("registrar un responsable nuevo lo crea ya asociado a este paciente", async () => {
    const api = iniciar("Lucía", {
      "POST /responsables": (init) => {
        const cuerpo = JSON.parse(String(init?.body));
        const { pacientes, ...r } = cuerpo;
        paciente.responsables = [{ ...r, id: "resp-nuevo" }];
        return { status: 201, body: { ...r, id: "resp-nuevo", pacientes: [] } };
      },
    });
    const user = userEvent.setup();
    abrir();
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Registrar nuevo" }));
    const modal = await screen.findByRole("dialog", { name: "Registrar responsable" });
    expect(within(modal).getByText("Se asociará a Lucía Gómez Alvarado.")).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: "Registrar y asociar" }));
    expect(await within(modal).findByText("Escribe el correo electrónico")).toBeInTheDocument();
    expect(within(modal).getByText("Escribe el parentesco, por ejemplo Madre")).toBeInTheDocument();

    await user.type(within(modal).getByLabelText("Nombres"), "Rosa");
    await user.type(within(modal).getByLabelText("Apellidos"), "Alvarado");
    await user.type(within(modal).getByLabelText("Parentesco"), "Abuela");
    await user.type(within(modal).getByLabelText("Teléfono"), "5555-0999");
    await user.type(within(modal).getByLabelText("Correo electrónico"), "no-es-correo");
    await user.type(within(modal).getByLabelText("Dirección"), "Zona 3");
    await user.click(within(modal).getByRole("button", { name: "Registrar y asociar" }));
    expect(await within(modal).findByText(/Escribe un correo válido/)).toBeInTheDocument();

    await user.clear(within(modal).getByLabelText("Correo electrónico"));
    await user.type(within(modal).getByLabelText("Correo electrónico"), "rosa@sigca.test");
    await user.click(within(modal).getByRole("button", { name: "Registrar y asociar" }));

    expect(await screen.findByText("Responsable registrado y asociado al paciente")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "POST", "/responsables")[0]!.init!.body))).toMatchObject({
      nombres: "Rosa", apellidos: "Alvarado", parentesco: "Abuela", telefono: "5555-0999", email: "rosa@sigca.test", pacientes: [paciente.id],
    });
    // al volver a cargar la ficha, ya no hay alerta
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByText(/Rosa Alvarado/)).toBeInTheDocument();
  });

  it("quitar al único responsable de un menor advierte que quedará sin responsable", async () => {
    const api = iniciar("Mateo");
    const user = userEvent.setup();
    abrir();
    await user.click(await screen.findByRole("button", { name: "Quitar a Ana María Morales Cruz como responsable" }));
    const confirmacion = await screen.findByRole("dialog", { name: "¿Quitar a Ana María Morales Cruz?" });
    expect(within(confirmacion).getByText(/único responsable de Mateo, que es menor de edad/)).toBeInTheDocument();
    expect(within(confirmacion).getByText(/no podrá programar citas hasta registrar otro/)).toBeInTheDocument();

    await user.click(within(confirmacion).getByRole("button", { name: "Quitar responsable" }));
    expect(await screen.findByText(/Ana María Morales Cruz ya no es responsable de Mateo/)).toBeInTheDocument();
    expect(consultasA(api, "DELETE", `/pacientes/${paciente.id}/responsables/${responsablePorNombre("Ana María").id}`)).toHaveLength(1);
    // y la ficha ahora muestra la alerta de la RN-04
    expect(await screen.findByRole("alert")).toHaveTextContent("Mateo es menor de edad y todavía no tiene un responsable");
  });

  it("quitar a uno de varios responsables no genera la advertencia fuerte", async () => {
    iniciar("Sebastián");
    const user = userEvent.setup();
    abrir();
    await user.click(await screen.findByRole("button", { name: "Quitar a Rosa Gómez Alvarado como responsable" }));
    const confirmacion = await screen.findByRole("dialog");
    expect(within(confirmacion).getByText(/el responsable sigue registrado y puede estar asociado a otros pacientes/)).toBeInTheDocument();
    expect(within(confirmacion).queryByText(/único responsable/)).not.toBeInTheDocument();
    await user.click(within(confirmacion).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText(/Rosa Gómez Alvarado/)).toBeInTheDocument(); // cancelar no quita nada
  });

  it("editar desde la ficha carga los datos y guarda", async () => {
    const api = iniciar("Valeria", { });
    const mock = api;
    const v = pacientePorNombre("Valeria");
    mock.mockImplementation(((orig) => async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = new URL(String(input));
      if (init?.method === "PUT" && u.pathname.endsWith(`/pacientes/${v.id}`)) {
        paciente = { ...paciente, ...JSON.parse(String(init.body)) };
        return new Response(JSON.stringify(paciente), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return orig(input, init);
    })(mock.getMockImplementation()!));
    const user = userEvent.setup();
    abrir();
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    const modal = await screen.findByRole("dialog", { name: "Editar paciente" });
    expect(within(modal).getByLabelText("Apellidos")).toHaveValue("Castillo Juárez");
    await user.clear(within(modal).getByLabelText("Dirección"));
    await user.type(within(modal).getByLabelText("Dirección"), "Zona 15, Ciudad de Guatemala");
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    expect(await screen.findByText("Zona 15, Ciudad de Guatemala")).toBeInTheDocument();
  });

  it("desactivar desde la ficha pide confirmación; un paciente inactivo ofrece reactivar", async () => {
    const api = iniciar("Elena", { });
    const e = pacientePorNombre("Elena");
    api.mockImplementation(((orig) => async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = new URL(String(input));
      if (init?.method === "PATCH" && u.pathname.endsWith(`/pacientes/${e.id}/estado`)) {
        paciente = { ...paciente, estado: JSON.parse(String(init.body)).estado };
        return new Response(JSON.stringify(paciente), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return orig(input, init);
    })(api.getMockImplementation()!));
    const user = userEvent.setup();
    abrir();
    expect(await screen.findByText("Inactivo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reactivar" }));
    expect(await screen.findByText("Elena Barrios Quiñónez fue reactivado")).toBeInTheDocument();
    expect(await screen.findByText("Activo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const confirmacion = await screen.findByRole("dialog", { name: "¿Desactivar a Elena Barrios Quiñónez?" });
    await user.click(within(confirmacion).getByRole("button", { name: "Desactivar paciente" }));
    expect(await screen.findByText("Elena Barrios Quiñónez fue desactivado")).toBeInTheDocument();
    expect(hoyGuatemala()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
