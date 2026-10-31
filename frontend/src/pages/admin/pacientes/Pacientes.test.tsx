import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { calcularEdad, hoyGuatemala, textoEdad } from "@/lib/fechas";
import { useAuthStore } from "@/store/auth";
import { admin, consultasA, filtrarPacientes, pacientePorNombre, pacientesFixture, paginar } from "@/test/datos";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Paciente } from "@/types/api";
import Pacientes from "./Pacientes";

const rutas = [
  { path: "/admin/pacientes", element: <Pacientes /> },
  { path: "/admin/pacientes/:id", element: <p>Ficha del paciente</p> },
];

let pacientes: Paciente[];

function iniciar(extra: Parameters<typeof simularApi>[0] = {}) {
  pacientes = structuredClone(pacientesFixture);
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  return simularApi({ "GET /pacientes": (_i, url) => ({ body: filtrarPacientes(pacientes, url) }), ...extra });
}

beforeEach(reiniciarEstado);

describe("Pacientes (listado)", () => {
  it("muestra a todos con su edad, responsables y estado", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/pacientes");
    expect(await screen.findByRole("link", { name: "Mateo Hernández Morales" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(11); // encabezado + 10
    const fila = screen.getByRole("link", { name: "Sebastián Pérez Gómez" }).closest("tr")!;
    expect(within(fila).getByText(/17 años · menor de edad/)).toBeInTheDocument();
    expect(within(fila).getByText(/Marta Pérez López/)).toBeInTheDocument();
    expect(within(fila).getByText(/Rosa Gómez Alvarado/)).toBeInTheDocument(); // tiene 2 responsables
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("señala al menor sin responsable (RN-04) y solo a ese", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/pacientes");
    await screen.findByRole("link", { name: "Lucía Gómez Alvarado" });
    const avisos = screen.getAllByText("Menor sin responsable");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.closest("tr")).toHaveTextContent("Lucía Gómez Alvarado");
  });

  it("buscar sin tildes consulta al servidor y actualiza la lista", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await screen.findByRole("link", { name: "Mateo Hernández Morales" });
    await user.type(screen.getByLabelText("Buscar paciente"), "hernandez");

    await waitFor(() => expect(consultasA(api, "GET", "/pacientes").some((c) => c.url.searchParams.get("q") === "hernandez")).toBe(true));
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(3)); // Diego y Mateo
    expect(screen.getByText(/Página 1 de 1 · 2 pacientes/)).toBeInTheDocument();
  });

  it("no consulta en cada tecla (espera a que termine de escribir)", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await screen.findByRole("link", { name: "Mateo Hernández Morales" });
    const antes = consultasA(api, "GET", "/pacientes").length;
    await user.type(screen.getByLabelText("Buscar paciente"), "valeria");
    await waitFor(() => expect(consultasA(api, "GET", "/pacientes").some((c) => c.url.searchParams.get("q") === "valeria")).toBe(true));
    const nuevas = consultasA(api, "GET", "/pacientes").slice(antes);
    expect(nuevas.length).toBeLessThanOrEqual(2); // no 7 consultas, una por letra
  });

  it("filtra por edad y por estado", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await screen.findByRole("link", { name: "Mateo Hernández Morales" });

    await user.selectOptions(screen.getByLabelText("Filtrar por edad"), "menores");
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(7)); // 6 menores
    expect(consultasA(api, "GET", "/pacientes").some((c) => c.url.searchParams.get("menores") === "true")).toBe(true);

    await user.selectOptions(screen.getByLabelText("Filtrar por edad"), "mayores");
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(5)); // 4 mayores

    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "INACTIVO");
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2)); // Elena
    expect(screen.getByRole("link", { name: /Elena/ })).toBeInTheDocument();
  });

  it("sin resultados ofrece quitar los filtros", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await screen.findByRole("link", { name: "Mateo Hernández Morales" });
    await user.type(screen.getByLabelText("Buscar paciente"), "zzzz");
    expect(await screen.findByText("Ningún paciente coincide con la búsqueda")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(await screen.findByRole("link", { name: "Mateo Hernández Morales" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar paciente")).toHaveValue("");
  });

  it("pagina: pide la página siguiente al servidor", async () => {
    const muchos = Array.from({ length: 22 }, (_, i) => ({ ...pacientesFixture[0]!, id: `p${i}`, nombres: `Paciente${String(i).padStart(2, "0")}` }));
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    const api = simularApi({ "GET /pacientes": (_i, url) => ({ body: paginar(muchos, url) }) });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    expect(await screen.findByText(/Página 1 de 2 · 22 pacientes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(await screen.findByText(/Página 2 de 2/)).toBeInTheDocument();
    expect(consultasA(api, "GET", "/pacientes").some((c) => c.url.searchParams.get("page") === "2")).toBe(true);
    expect(screen.getByRole("button", { name: /Siguiente/ })).toBeDisabled();
  });

  it("los filtros quedan en la URL: se pueden compartir y sobreviven a «volver»", async () => {
    const api = iniciar();
    renderConRutas(rutas, "/admin/pacientes?q=ortiz&edad=menores&page=1");
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2)); // Camila
    expect(screen.getByLabelText("Buscar paciente")).toHaveValue("ortiz");
    expect(screen.getByLabelText("Filtrar por edad")).toHaveValue("menores");
    const c = consultasA(api, "GET", "/pacientes")[0]!;
    expect(c.url.searchParams.get("q")).toBe("ortiz");
    expect(c.url.searchParams.get("menores")).toBe("true");
  });

  it("registrar: valida los campos y muestra la edad al escribir la fecha de nacimiento", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await user.click(await screen.findByRole("button", { name: "Nuevo paciente" }));
    const modal = await screen.findByRole("dialog", { name: "Nuevo paciente" });

    await user.click(within(modal).getByRole("button", { name: "Registrar paciente" }));
    expect(await within(modal).findByText(/Los nombres: escribe al menos 2 caracteres/)).toBeInTheDocument();
    expect(within(modal).getByText("Elige la fecha de nacimiento")).toBeInTheDocument();
    expect(within(modal).getByText("Elige el sexo")).toBeInTheDocument();
    expect(consultasA(api, "POST", "/pacientes")).toHaveLength(0);

    await user.type(within(modal).getByLabelText("Fecha de nacimiento"), "2020-05-10");
    const edad = calcularEdad("2020-05-10");
    expect(await within(modal).findByText(textoEdad(edad))).toBeInTheDocument();
    expect(within(modal).getByText(/Es menor de edad: necesitará al menos un responsable/)).toBeInTheDocument();

    await user.clear(within(modal).getByLabelText("Fecha de nacimiento"));
    await user.type(within(modal).getByLabelText("Fecha de nacimiento"), "1990-05-10");
    expect(await within(modal).findByText(textoEdad(calcularEdad("1990-05-10")))).toBeInTheDocument();
    expect(within(modal).queryByText(/Es menor de edad/)).not.toBeInTheDocument();
  });

  it("registrar: rechaza nombres con números y fechas futuras", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await user.click(await screen.findByRole("button", { name: "Nuevo paciente" }));
    const modal = await screen.findByRole("dialog");
    await user.type(within(modal).getByLabelText("Nombres"), "Juan123");
    await user.tab();
    expect(await within(modal).findByText("Los nombres: solo letras y espacios")).toBeInTheDocument();

    const manana = new Date(Date.now() + 2 * 86400000).toLocaleDateString("sv-SE");
    await user.type(within(modal).getByLabelText("Fecha de nacimiento"), manana);
    await user.tab();
    expect(await within(modal).findByText("La fecha de nacimiento no puede ser futura")).toBeInTheDocument();
    expect(within(modal).queryByText(/Es menor de edad/)).not.toBeInTheDocument(); // y no muestra una edad absurda
  });

  it("registrar: envía los datos limpios y abre la ficha del paciente nuevo", async () => {
    const api = iniciar({
      "POST /pacientes": (init) => ({ status: 201, body: { ...pacientesFixture[0]!, ...JSON.parse(String(init?.body)), id: "nuevo-1", responsables: [] } }),
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await user.click(await screen.findByRole("button", { name: "Nuevo paciente" }));
    const modal = await screen.findByRole("dialog");

    await user.type(within(modal).getByLabelText("Nombres"), "  María José ");
    await user.type(within(modal).getByLabelText("Apellidos"), "O'Connor");
    await user.type(within(modal).getByLabelText("Fecha de nacimiento"), "2015-03-20");
    await user.selectOptions(within(modal).getByLabelText("Sexo"), "FEMENINO");
    await user.type(within(modal).getByLabelText("Teléfono"), "5555-1234");
    await user.type(within(modal).getByLabelText("Dirección"), "Zona 10, Ciudad de Guatemala");
    await user.click(within(modal).getByRole("button", { name: "Registrar paciente" }));

    expect(await screen.findByText("Ficha del paciente")).toBeInTheDocument(); // navegó a /admin/pacientes/nuevo-1
    expect(JSON.parse(String(consultasA(api, "POST", "/pacientes")[0]!.init!.body))).toEqual({
      nombres: "María José", apellidos: "O'Connor", fechaNacimiento: "2015-03-20", sexo: "FEMENINO", telefono: "5555-1234",
      direccion: "Zona 10, Ciudad de Guatemala", fechaInicio: hoyGuatemala(), observaciones: "", fotoUrl: "", fotoKey: "",
    });
    expect(await screen.findByText("Paciente registrado")).toBeInTheDocument();
  });

  it("un error del servidor se muestra bajo el campo que corresponde", async () => {
    iniciar({ "POST /pacientes": { status: 400, body: { message: "Datos inválidos", errors: [{ campo: "telefono", mensaje: "Teléfono ya registrado" }] } } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await user.click(await screen.findByRole("button", { name: "Nuevo paciente" }));
    const modal = await screen.findByRole("dialog");
    await user.type(within(modal).getByLabelText("Nombres"), "Ana");
    await user.type(within(modal).getByLabelText("Apellidos"), "López");
    await user.type(within(modal).getByLabelText("Fecha de nacimiento"), "1990-01-15");
    await user.selectOptions(within(modal).getByLabelText("Sexo"), "FEMENINO");
    await user.type(within(modal).getByLabelText("Teléfono"), "5555-1234");
    await user.type(within(modal).getByLabelText("Dirección"), "Zona 1");
    await user.click(within(modal).getByRole("button", { name: "Registrar paciente" }));
    expect(await within(modal).findByText("Teléfono ya registrado")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Teléfono")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // el formulario sigue abierto
  });

  it("editar: carga los datos actuales y envía los cambios", async () => {
    const mateo = pacientePorNombre("Mateo");
    const api = iniciar({ [`PUT /pacientes/${mateo.id}`]: (init) => ({ body: { ...mateo, ...JSON.parse(String(init?.body)) } }) });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");
    await user.click(await screen.findByRole("button", { name: "Editar a Mateo Hernández Morales" }));
    const modal = await screen.findByRole("dialog", { name: "Editar paciente" });
    expect(within(modal).getByLabelText("Nombres")).toHaveValue("Mateo");
    expect(within(modal).getByLabelText("Fecha de nacimiento")).toHaveValue(mateo.fechaNacimiento);
    expect(within(modal).getByLabelText("Sexo")).toHaveValue("MASCULINO");

    await user.clear(within(modal).getByLabelText("Teléfono"));
    await user.type(within(modal).getByLabelText("Teléfono"), "5555-7777");
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PUT", `/pacientes/${mateo.id}`)[0]!.init!.body)).telefono).toBe("5555-7777");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("desactivar pide confirmación y envía el nuevo estado; reactivar es directo", async () => {
    const mateo = pacientePorNombre("Mateo");
    const elena = pacientePorNombre("Elena");
    const api = iniciar({
      [`PATCH /pacientes/${mateo.id}/estado`]: (init) => { const estado = JSON.parse(String(init?.body)).estado; pacientes = pacientes.map((p) => (p.id === mateo.id ? { ...p, estado } : p)); return { body: { ...mateo, estado } }; },
      [`PATCH /pacientes/${elena.id}/estado`]: (init) => ({ body: { ...elena, estado: JSON.parse(String(init?.body)).estado } }),
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/pacientes");

    await user.click(await screen.findByRole("button", { name: "Desactivar a Mateo Hernández Morales" }));
    const confirmacion = await screen.findByRole("dialog", { name: "¿Desactivar a Mateo Hernández Morales?" });
    expect(within(confirmacion).getByText(/No podrá recibir nuevas citas/)).toBeInTheDocument();
    await user.click(within(confirmacion).getByRole("button", { name: "Desactivar paciente" }));
    expect(await screen.findByText("Mateo Hernández Morales fue desactivado")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PATCH", `/pacientes/${mateo.id}/estado`)[0]!.init!.body))).toEqual({ estado: "INACTIVO" });

    await user.click(screen.getByRole("button", { name: "Reactivar a Elena Barrios Quiñónez" }));
    expect(await screen.findByText("Elena Barrios Quiñónez fue reactivado")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PATCH", `/pacientes/${elena.id}/estado`)[0]!.init!.body))).toEqual({ estado: "ACTIVO" });
  });

  it("si falla la carga muestra el error con opción de reintentar", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    simularApi({ "GET /pacientes": { status: 500, body: { message: "Error interno del servidor" } } });
    renderConRutas(rutas, "/admin/pacientes");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno del servidor");
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
  });
});
