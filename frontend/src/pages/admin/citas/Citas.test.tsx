import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { hoyGuatemala } from "@/lib/fechas";
import { useAuthStore } from "@/store/auth";
import { citaPor, citasFixture, consultasA, detalleDeCita, filtrarCitas, pacientePorNombre, profesionalesFixture, usuarioPorRol } from "@/test/datos";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Cita, Rol } from "@/types/api";
import Citas from "./Citas";

const rutas = [{ path: "/admin/citas", element: <Citas /> }, { path: "/admin/pacientes/:id", element: <p>Ficha</p> }];
const sumarDias = (f: string, n: number) => { const d = new Date(`${f}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

let citas: Cita[];

function iniciar(rol: Rol = "RECEPCIONISTA", extra: Parameters<typeof simularApi>[0] = {}) {
  citas = structuredClone(citasFixture);
  useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol(rol), token: "t" });
  return simularApi({
    "GET /citas": (_i, url) => ({ body: filtrarCitas(citas, url) }),
    "GET /usuarios/profesionales": { body: profesionalesFixture },
    ...extra,
  });
}
const ultima = (api: ReturnType<typeof simularApi>) => consultasA(api, "GET", "/citas").at(-1)!.url.searchParams;

beforeEach(reiniciarEstado);

describe("Citas (listado)", () => {
  it("por defecto muestra las pendientes y confirmadas de los próximos 30 días", async () => {
    const api = iniciar();
    renderConRutas(rutas, "/admin/citas");
    await screen.findAllByText("Mateo Hernández Morales");

    const p = consultasA(api, "GET", "/citas")[0]!.url.searchParams;
    expect(p.get("desde")).toBe(hoyGuatemala());
    expect(p.get("hasta")).toBe(sumarDias(hoyGuatemala(), 30));
    expect(p.get("estado")).toBe("PENDIENTE,CONFIRMADA");
    expect(screen.getAllByRole("row")).toHaveLength(9); // encabezado + 8 activas del fixture
  });

  it("cada fila muestra fecha, horario, paciente con edad, servicio, profesional y estado", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/citas");
    const c = citaPor("CONFIRMADA", "Valeria");
    const fila = (await screen.findAllByText(`${c.paciente.nombres} ${c.paciente.apellidos}`)).map((e) => e.closest("tr")!).find((tr) => tr.textContent?.includes(c.servicio.nombre))!;
    expect(within(fila).getByText(new RegExp(`${Number(c.horaInicio.slice(0, 2)) % 12 || 12}:${c.horaInicio.slice(3)}`))).toBeInTheDocument();
    expect(within(fila).getByText(/9 años · menor/)).toBeInTheDocument();
    expect(within(fila).getByText(c.profesional.nombre)).toBeInTheDocument();
    expect(within(fila).getByText("Confirmada")).toBeInTheDocument();
  });

  it("cambiar el período consulta el rango correspondiente", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas");
    await screen.findAllByText("Mateo Hernández Morales");

    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "hoy");
    await waitFor(() => expect(ultima(api).get("desde")).toBe(hoyGuatemala()));
    expect(ultima(api).get("hasta")).toBe(hoyGuatemala());

    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "pasadas");
    await waitFor(() => expect(ultima(api).get("orden")).toBe("desc"));
    expect(ultima(api).get("hasta")).toBe(sumarDias(hoyGuatemala(), -1));

    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "todas");
    await waitFor(() => expect(ultima(api).get("desde")).toBeNull());
    expect(ultima(api).get("hasta")).toBeNull();
  });

  it("filtra por estado y por profesional", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas");
    await screen.findAllByText("Mateo Hernández Morales");

    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "COMPLETADA");
    await waitFor(() => expect(ultima(api).get("estado")).toBe("COMPLETADA"));
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(8)); // 7 completadas + encabezado

    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "todos");
    await waitFor(() => expect(ultima(api).get("estado")).toBeNull());

    await user.selectOptions(screen.getByLabelText("Filtrar por profesional"), profesionalesFixture[1]!.id);
    await waitFor(() => expect(ultima(api).get("profesionalId")).toBe(profesionalesFixture[1]!.id));
    await waitFor(() => expect(screen.getAllByRole("row").slice(1).every((r) => r.textContent?.includes(profesionalesFixture[1]!.nombre))).toBe(true));
  });

  it("el profesional no ve la columna ni el filtro de profesional, ni puede programar", async () => {
    const ana = profesionalesFixture.find((p) => p.email === "profesional1@sigca.test")!;
    useAuthStore.setState({ estado: "autenticado", usuario: { ...usuarioPorRol("PROFESIONAL"), id: ana.id }, token: "t" });
    simularApi({ "GET /citas": (_i, url) => ({ body: filtrarCitas(citasFixture.filter((c) => c.profesional.id === ana.id), url) }) });
    renderConRutas(rutas, "/admin/citas");
    await screen.findAllByRole("row");
    expect(screen.queryByRole("columnheader", { name: "Profesional" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por profesional")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Programar cita" })).not.toBeInTheDocument();
    expect(screen.getByText("Tus citas programadas.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar la cita/ })).not.toBeInTheDocument();
  });

  it("con ?paciente= muestra el historial completo de ese paciente", async () => {
    const mateo = pacientePorNombre("Mateo");
    const api = iniciar();
    renderConRutas(rutas, `/admin/citas?paciente=${mateo.id}`);
    expect(await screen.findByRole("heading", { level: 1, name: "Historial de citas" })).toBeInTheDocument();
    await screen.findAllByText("Mateo Hernández Morales");
    expect(screen.getByText("Mateo Hernández Morales", { selector: "p.mt-1" })).toBeInTheDocument(); // subtítulo con el nombre del paciente
    const p = consultasA(api, "GET", "/citas")[0]!.url.searchParams;
    expect(p.get("pacienteId")).toBe(mateo.id);
    expect(p.get("desde")).toBeNull(); // todas las fechas
    expect(p.get("estado")).toBeNull(); // todos los estados
    expect(screen.getAllByRole("row")).toHaveLength(6); // 5 citas de Mateo + encabezado
    expect(screen.getByRole("button", { name: "Ver las citas de todos los pacientes" })).toBeInTheDocument();
  });

  it("el botón de historial de una fila abre las citas de ese paciente", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas");
    const c = citaPor("PENDIENTE");
    await user.click((await screen.findAllByRole("link", { name: `Historial de ${c.paciente.nombres} ${c.paciente.apellidos}` }))[0]!); // un paciente puede tener varias citas activas
    await waitFor(() => expect(ultima(api).get("pacienteId")).toBe(c.paciente.id));
    expect(await screen.findByRole("heading", { level: 1, name: "Historial de citas" })).toBeInTheDocument();
  });

  it("confirmar una pendiente desde la fila envía el cambio de estado", async () => {
    const c = citaPor("PENDIENTE");
    const api = iniciar("RECEPCIONISTA", { [`PATCH /citas/${c.id}/estado`]: { body: { ...c, estado: "CONFIRMADA" } } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas");
    await user.click(await screen.findByRole("button", { name: `Confirmar la cita de ${c.paciente.nombres} ${c.paciente.apellidos}` }));
    expect(await screen.findByText("Cita confirmada")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PATCH", `/citas/${c.id}/estado`)[0]!.init!.body))).toEqual({ estado: "CONFIRMADA" });
  });

  it("solo las pendientes ofrecen «confirmar» en la fila", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/citas");
    await screen.findAllByText("Mateo Hernández Morales");
    expect(screen.getAllByRole("button", { name: /Confirmar la cita de/ })).toHaveLength(4); // 4 pendientes
  });

  it("«Ver detalle» abre la cita completa", async () => {
    const c = citaPor("CONFIRMADA", "Valeria");
    iniciar("RECEPCIONISTA", { [`GET /citas/${c.id}`]: { body: detalleDeCita(c) } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas");
    await user.click(await screen.findByRole("button", { name: new RegExp(`Ver detalle de la cita de Valeria.*${c.fecha}`) }));
    expect(await screen.findByRole("dialog", { name: `Valeria Castillo Juárez · ${c.servicio.nombre}` })).toBeInTheDocument();
  });

  it("«Programar cita» abre el formulario", async () => {
    iniciar("RECEPCIONISTA", { "GET /servicios": { body: [] }, "GET /pacientes": { body: { items: [], total: 0, page: 1, limit: 6, pages: 1 } } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas");
    await user.click(await screen.findByRole("button", { name: "Programar cita" }));
    expect(await screen.findByRole("dialog", { name: "Programar cita" })).toBeInTheDocument();
  });

  it("sin resultados ofrece programar una cita", async () => {
    iniciar("RECEPCIONISTA", { "GET /citas": { body: { items: [], total: 0, page: 1, limit: 20, pages: 1 } } });
    renderConRutas(rutas, "/admin/citas");
    expect(await screen.findByText("No hay citas con estos filtros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Programar una cita" })).toBeInTheDocument();
  });

  it("pagina de a 20 y pide la página siguiente", async () => {
    const muchas = Array.from({ length: 45 }, (_, i) => ({ ...citasFixture[0]!, id: `c${i}` }));
    useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol("ADMINISTRADOR"), token: "t" });
    const api = simularApi({ "GET /citas": (_i, url) => ({ body: filtrarCitas(muchas, url) }), "GET /usuarios/profesionales": { body: profesionalesFixture } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/citas?estado=todos");
    expect(await screen.findByText(/Página 1 de 3 · 45 citas/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    await waitFor(() => expect(ultima(api).get("page")).toBe("2"));
    expect(await screen.findByText(/Página 2 de 3/)).toBeInTheDocument();
  });

  it("si falla la carga muestra el error con opción de reintentar", async () => {
    iniciar("RECEPCIONISTA", { "GET /citas": { status: 500, body: { message: "Error interno del servidor" } } });
    renderConRutas(rutas, "/admin/citas");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno del servidor");
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
  });
});
