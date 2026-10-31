import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hoyGuatemala } from "@/lib/fechas";
import { useAuthStore } from "@/store/auth";
import { citaPor, consultasA, filtrarPacientes, pacientePorNombre, pacientesFixture, profesionalesFixture, usuarioPorRol } from "@/test/datos";
import serviciosAdmin from "@/test/fixtures/servicios-admin.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Cita, Disponibilidad, Servicio } from "@/types/api";
import { FormularioCita } from "./FormularioCita";

const sumarDias = (f: string, n: number) => { const d = new Date(`${f}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const FECHA = sumarDias(hoyGuatemala(), 3);
const servicios = serviciosAdmin as unknown as Servicio[];
const atencion = servicios.find((s) => s.nombre === "Atención psicológica")!;
const ana = profesionalesFixture[0]!;

const slots = (duracionMin = 50, extra: Disponibilidad["horarios"] = []): Disponibilidad["horarios"] => [
  { horaInicio: "08:00", horaFin: "08:50" }, { horaInicio: "09:00", horaFin: "09:50" },
  { horaInicio: "14:00", horaFin: "14:50" }, { horaInicio: "14:50", horaFin: "15:40" }, ...extra,
].map((h) => ({ ...h, horaFin: h.horaFin }));

function iniciar(extra: Parameters<typeof simularApi>[0] = {}, horarios = slots()) {
  useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol("RECEPCIONISTA"), token: "t" });
  return simularApi({
    "GET /pacientes": (_i, url) => ({ body: filtrarPacientes(pacientesFixture, url) }),
    "GET /servicios": { body: [...servicios, { ...servicios[0]!, id: "inactivo-1", nombre: "Servicio descontinuado", estado: "INACTIVO" }] },
    "GET /usuarios/profesionales": { body: profesionalesFixture },
    "GET /citas/disponibilidad": (_i, url) => ({ body: { fecha: url.searchParams.get("fecha"), duracionMin: 50, horarios } }),
    ...extra,
  });
}

function abrir(props: Partial<Parameters<typeof FormularioCita>[0]> = {}) {
  const onCerrar = vi.fn();
  const onGuardado = vi.fn();
  renderConRutas([{ path: "/", element: <FormularioCita onCerrar={onCerrar} onGuardado={onGuardado} {...props} /> }, { path: "/admin/pacientes/:id", element: <p>Ficha</p> }], "/");
  return { onCerrar, onGuardado };
}

const dispon = (api: ReturnType<typeof simularApi>) => consultasA(api, "GET", "/citas/disponibilidad");

async function llenar(user: ReturnType<typeof userEvent.setup>, { paciente = "Mateo", fecha = FECHA } = {}) {
  await user.type(screen.getByLabelText("Paciente"), paciente.toLowerCase());
  await user.click(await screen.findByRole("button", { name: new RegExp(`Elegir a ${paciente}`) }));
  await screen.findByRole("option", { name: /Atención psicológica/ });
  await user.selectOptions(screen.getByLabelText("Servicio"), atencion.id);
  await user.selectOptions(screen.getByLabelText("Profesional"), ana.id);
  await user.type(screen.getByLabelText("Fecha"), fecha);
}

beforeEach(reiniciarEstado);

describe("FormularioCita: programar", () => {
  it("al inicio explica qué falta y no consulta horarios todavía", async () => {
    const api = iniciar();
    abrir();
    expect(await screen.findByText("Elige el servicio, el profesional y la fecha para ver los horarios libres.")).toBeInTheDocument();
    expect(dispon(api)).toHaveLength(0);
  });

  it("solo ofrece servicios activos, con su duración", async () => {
    iniciar();
    abrir();
    const select = await screen.findByLabelText("Servicio");
    await within(select).findByRole("option", { name: /Atención psicológica · 50 min/ });
    expect(within(select).queryByRole("option", { name: /descontinuado/ })).not.toBeInTheDocument();
  });

  it("busca entre los pacientes ACTIVOS y permite cambiar la elección", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    abrir();
    await user.type(screen.getByLabelText("Paciente"), "mateo");
    await user.click(await screen.findByRole("button", { name: "Elegir a Mateo Hernández Morales" }));
    expect(consultasA(api, "GET", "/pacientes").every((c) => c.url.searchParams.get("estado") === "ACTIVO")).toBe(true);
    expect(screen.getByText("Mateo Hernández Morales")).toBeInTheDocument();
    expect(screen.getByText(/6 años · menor de edad/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cambiar/ }));
    expect(await screen.findByLabelText("Paciente")).toBeInTheDocument(); // vuelve al buscador
  });

  it("RN-04: un menor sin responsable no se puede elegir y se indica cómo resolverlo", async () => {
    iniciar();
    const user = userEvent.setup();
    abrir();
    await user.type(screen.getByLabelText("Paciente"), "lucia");
    expect(await screen.findByText(/Menor sin responsable/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Elegir a Lucía/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registra uno" })).toHaveAttribute("href", `/admin/pacientes/${pacientePorNombre("Lucía").id}`);
  });

  it("un paciente ya indicado (desde su ficha) no se puede cambiar", async () => {
    iniciar();
    abrir({ paciente: pacientePorNombre("Valeria") });
    expect(await screen.findByText("Valeria Castillo Juárez")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cambiar/ })).not.toBeInTheDocument();
  });

  it("al elegir servicio, profesional y fecha consulta y muestra los horarios libres agrupados", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    abrir();
    await llenar(user);

    const grupo = await screen.findByRole("group", { name: "Horario disponible" });
    await within(grupo).findByRole("radio", { name: /8:00.*8:50/ });
    expect(within(grupo).getAllByRole("radio")).toHaveLength(4);
    expect(within(grupo).getByText("Mañana")).toBeInTheDocument();
    expect(within(grupo).getByText("Tarde")).toBeInTheDocument();

    const q = dispon(api).at(-1)!.url.searchParams;
    expect(q.get("profesionalId")).toBe(ana.id);
    expect(q.get("servicioId")).toBe(atencion.id);
    expect(q.get("fecha")).toBe(FECHA);
    expect(q.get("excluirCitaId")).toBeNull();
  });

  it("programar: valida lo obligatorio antes de enviar", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    abrir();
    await user.click(screen.getByRole("button", { name: "Programar cita" }));
    expect(await screen.findByText("Elige al paciente")).toBeInTheDocument();
    expect(screen.getByText("Elige el servicio")).toBeInTheDocument();
    expect(screen.getByText("Elige al profesional")).toBeInTheDocument();
    expect(screen.getByText("Elige la fecha")).toBeInTheDocument();
    expect(screen.getByText("Elige uno de los horarios disponibles")).toBeInTheDocument();
    expect(consultasA(api, "POST", "/citas")).toHaveLength(0);
  });

  it("no permite una fecha pasada y no consulta horarios para ella", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    abrir();
    await within(await screen.findByLabelText("Profesional")).findByRole("option", { name: ana.nombre }); // esperar a que carguen
    await user.selectOptions(screen.getByLabelText("Profesional"), ana.id);
    await user.type(screen.getByLabelText("Fecha"), sumarDias(hoyGuatemala(), -2));
    await user.tab();
    expect(await screen.findByText("No se pueden programar citas en fechas pasadas")).toBeInTheDocument();
    expect(dispon(api)).toHaveLength(0);
  });

  it("regresión: antes de intentar enviar no se muestra «elige un horario», y elegirlo y enviar de inmediato funciona", async () => {
    iniciar({ "POST /citas": { status: 201, body: citaPor("PENDIENTE") } });
    const user = userEvent.setup();
    abrir();
    await llenar(user); // al salir del campo fecha se valida el formulario completo
    await screen.findByRole("radio", { name: /8:00.*8:50/ });
    expect(screen.queryByText("Elige uno de los horarios disponibles")).not.toBeInTheDocument();
    expect(screen.queryByText("Elige al paciente")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /8:00.*8:50/ }));
    await user.click(screen.getByRole("button", { name: "Programar cita" })); // sin pasos intermedios
    expect(await screen.findByText("Cita programada")).toBeInTheDocument();
  });

  it("programar: elige un horario y envía todo al servidor", async () => {
    const api = iniciar({ "POST /citas": (init) => ({ status: 201, body: { ...citaPor("PENDIENTE"), ...JSON.parse(String(init?.body)) } }) });
    const user = userEvent.setup();
    const { onCerrar, onGuardado } = abrir();
    await llenar(user);
    await user.click(await screen.findByRole("radio", { name: /2:00.*2:50/ }));
    await user.type(screen.getByLabelText("Observaciones (opcional)"), "Primera sesión");
    await user.click(screen.getByRole("button", { name: "Programar cita" }));

    expect(await screen.findByText("Cita programada")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "POST", "/citas")[0]!.init!.body))).toEqual({
      pacienteId: pacientePorNombre("Mateo").id, servicioId: atencion.id, profesionalId: ana.id,
      fecha: FECHA, horaInicio: "14:00", observaciones: "Primera sesión",
    });
    expect(onGuardado).toHaveBeenCalledTimes(1);
    expect(onCerrar).toHaveBeenCalled();
  });

  it("sin observaciones, no las envía", async () => {
    const api = iniciar({ "POST /citas": { status: 201, body: citaPor("PENDIENTE") } });
    const user = userEvent.setup();
    abrir();
    await llenar(user);
    await user.click(await screen.findByRole("radio", { name: /8:00.*8:50/ }));
    await user.click(screen.getByRole("button", { name: "Programar cita" }));
    await screen.findByText("Cita programada");
    expect(JSON.parse(String(consultasA(api, "POST", "/citas")[0]!.init!.body))).not.toHaveProperty("observaciones");
  });

  it("cambiar la fecha limpia el horario elegido y vuelve a consultar", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    abrir();
    await llenar(user);
    const radio = await screen.findByRole("radio", { name: /9:00.*9:50/ });
    await user.click(radio);
    expect(radio).toBeChecked();
    const consultasAntes = dispon(api).length;

    const otra = sumarDias(FECHA, 1);
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: otra } });
    await waitFor(() => expect(dispon(api).length).toBeGreaterThan(consultasAntes));
    expect(dispon(api).at(-1)!.url.searchParams.get("fecha")).toBe(otra);
    const nuevo = await screen.findByRole("radio", { name: /9:00.*9:50/ });
    expect(nuevo).not.toBeChecked();
  });

  it("si no hay horarios ese día, lo dice y sugiere alternativas", async () => {
    iniciar({}, []);
    const user = userEvent.setup();
    abrir();
    await llenar(user);
    expect(await screen.findByText(/No hay horarios disponibles ese día/)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("si el horario se ocupó mientras tanto (409), muestra el motivo y actualiza los horarios", async () => {
    const api = iniciar({ "POST /citas": { status: 409, body: { message: "El profesional ya tiene una cita de 14:00 a 14:50 ese día" } } });
    const user = userEvent.setup();
    const { onCerrar } = abrir();
    await llenar(user);
    await user.click(await screen.findByRole("radio", { name: /2:00.*2:50/ }));
    const antes = dispon(api).length;
    await user.click(screen.getByRole("button", { name: "Programar cita" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El profesional ya tiene una cita de 14:00 a 14:50 ese día");
    await waitFor(() => expect(dispon(api).length).toBeGreaterThan(antes)); // vuelve a pedir los horarios libres
    expect(onCerrar).not.toHaveBeenCalled(); // el formulario sigue abierto
    expect(screen.queryByText("Cita programada")).not.toBeInTheDocument();
  });

  it("si un horario elegido deja de estar disponible, se deselecciona", async () => {
    let atendidas = 0;
    const api = iniciar({
      "GET /citas/disponibilidad": (_i, url) => {
        atendidas++;
        const todos = slots();
        return { body: { fecha: url.searchParams.get("fecha"), duracionMin: 50, horarios: atendidas === 1 ? todos : todos.filter((h) => h.horaInicio !== "09:00") } };
      },
    });
    const user = userEvent.setup();
    abrir();
    await llenar(user);
    const radio = await screen.findByRole("radio", { name: /9:00.*9:50/ });
    await user.click(radio);
    expect(radio).toBeChecked();
    // otra persona toma las 9:00; al refrescarse la lista, ya no se ofrece ni queda seleccionada
    await user.selectOptions(screen.getByLabelText("Profesional"), profesionalesFixture[1]!.id);
    await user.selectOptions(screen.getByLabelText("Profesional"), ana.id);
    await waitFor(() => expect(screen.queryByRole("radio", { name: /9:00.*9:50/ })).not.toBeInTheDocument());
    expect(dispon(api).length).toBeGreaterThanOrEqual(2);
  });
});

describe("FormularioCita: reprogramar", () => {
  /** La cita del fixture, pero en una fecha futura (el fixture tiene fechas fijas). */
  const citaFutura = (): Cita => ({ ...citaPor("CONFIRMADA"), fecha: FECHA, horaInicio: "09:00", horaFin: "09:50", observaciones: "Traer informe" });

  it("muestra la cita actual, no permite cambiar paciente ni servicio, y pide horarios excluyendo la propia cita", async () => {
    const c = citaFutura();
    const api = iniciar();
    abrir({ cita: c });
    expect(await screen.findByText(/^Ahora:/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Servicio")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Paciente")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Profesional")).toHaveValue(c.profesional.id)); // cuando cargan las opciones
    expect(screen.getByLabelText("Fecha")).toHaveValue(FECHA);
    await screen.findByRole("radio", { name: /9:00.*9:50/ });
    expect(dispon(api).at(-1)!.url.searchParams.get("excluirCitaId")).toBe(c.id); // su propio horario cuenta como libre
    expect(screen.getByRole("radio", { name: /9:00.*9:50/ })).toBeChecked(); // y sigue elegido
  });

  it("reprogramar envía solo fecha, hora, profesional y observaciones", async () => {
    const c = citaFutura();
    const api = iniciar({ [`PUT /citas/${c.id}`]: (init) => ({ body: { ...c, ...JSON.parse(String(init?.body)) } }) });
    const user = userEvent.setup();
    const { onCerrar } = abrir({ cita: c });
    await user.click(await screen.findByRole("radio", { name: /2:50.*3:40/ }));
    await user.click(screen.getByRole("button", { name: "Reprogramar cita" }));

    expect(await screen.findByText("Cita reprogramada")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PUT", `/citas/${c.id}`)[0]!.init!.body))).toEqual({
      fecha: FECHA, horaInicio: "14:50", profesionalId: c.profesional.id, observaciones: "Traer informe",
    });
    expect(onCerrar).toHaveBeenCalled();
  });

  it("un conflicto al reprogramar se muestra y no cierra el formulario", async () => {
    const c = citaFutura();
    iniciar({ [`PUT /citas/${c.id}`]: { status: 409, body: { message: "El profesional ya tiene una cita de 09:00 a 09:50 ese día" } } });
    const user = userEvent.setup();
    const { onCerrar } = abrir({ cita: c });
    await user.click(await screen.findByRole("radio", { name: /8:00.*8:50/ }));
    await user.click(screen.getByRole("button", { name: "Reprogramar cita" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ya tiene una cita/);
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
