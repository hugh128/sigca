import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { citaPor, consultasA, detalleDeCita, profesionalesFixture, usuarioPorRol } from "@/test/datos";
import serviciosAdmin from "@/test/fixtures/servicios-admin.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Cita, Rol } from "@/types/api";
import { DetalleCita } from "./DetalleCita";

function abrir(cita: Cita, rol: Rol, extra: Parameters<typeof simularApi>[0] = {}, detalle: Cita = detalleDeCita(cita)) {
  useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol(rol), token: "t" });
  const onCerrar = vi.fn();
  const api = simularApi({
    [`GET /citas/${cita.id}`]: () => ({ body: detalle }),
    "GET /usuarios/profesionales": { body: profesionalesFixture },
    "GET /servicios": { body: serviciosAdmin },
    ...extra,
  });
  renderConRutas([{ path: "/", element: <DetalleCita citaId={cita.id} onCerrar={onCerrar} /> }], "/");
  return { api, onCerrar };
}
const boton = (n: string | RegExp) => screen.queryByRole("button", { name: n });
/** La ventana aparece de inmediato; el contenido, cuando carga la cita. */
const cargado = () => screen.findByRole("region", { name: "Historial" });

beforeEach(reiniciarEstado);

describe("Detalle de la cita", () => {
  it("muestra paciente, profesional, servicio, duración, precio e historial con quién hizo cada cambio", async () => {
    const c = citaPor("CONFIRMADA", "Valeria");
    abrir(c, "RECEPCIONISTA");
    const modal = await screen.findByRole("dialog", { name: `Valeria Castillo Juárez · ${c.servicio.nombre}` });
    expect(within(modal).getByRole("link", { name: "Valeria Castillo Juárez" })).toHaveAttribute("href", `/admin/pacientes/${c.paciente.id}`);
    expect(within(modal).getByText(/9 años · menor de edad/)).toBeInTheDocument();
    expect(within(modal).getByText(c.profesional.nombre)).toBeInTheDocument();
    expect(within(modal).getAllByText("Confirmada").length).toBeGreaterThanOrEqual(2); // la insignia y su entrada en el historial
    expect(within(modal).getByText(new RegExp(`${c.duracionMin} min · .*\\d+[.,]00`))).toBeInTheDocument(); // duración y precio
    const historial = within(modal).getByRole("region", { name: "Historial" });
    expect(within(historial).getAllByRole("listitem")).toHaveLength(c.historial.length);
    expect(within(historial).getAllByText(/Laura Méndez/).length).toBe(c.historial.length);
  });

  it("recepción con una cita PENDIENTE: confirmar, reprogramar y cancelar; no completar", async () => {
    abrir(citaPor("PENDIENTE"), "RECEPCIONISTA");
    await cargado();
    expect(boton("Confirmar cita")).toBeInTheDocument();
    expect(boton("Reprogramar")).toBeInTheDocument();
    expect(boton("Cancelar cita")).toBeInTheDocument();
    expect(boton("Marcar como completada")).not.toBeInTheDocument();
  });

  it("recepción con una cita CONFIRMADA: ya no ofrece confirmar, y nunca completar", async () => {
    abrir(citaPor("CONFIRMADA"), "RECEPCIONISTA");
    await cargado();
    expect(boton("Confirmar cita")).not.toBeInTheDocument();
    expect(boton("Marcar como completada")).not.toBeInTheDocument();
    expect(boton("Reprogramar")).toBeInTheDocument();
    expect(boton("Cancelar cita")).toBeInTheDocument();
  });

  it("el profesional solo puede completar su cita confirmada y no ve precios", async () => {
    const c = citaPor("CONFIRMADA");
    const { precioCentavos: _p, ...sinPrecio } = c;
    abrir(c, "PROFESIONAL", {}, detalleDeCita(sinPrecio as Cita));
    await cargado();
    const modal = screen.getByRole("dialog");
    expect(boton("Marcar como completada")).toBeInTheDocument();
    expect(boton("Cancelar cita")).not.toBeInTheDocument();
    expect(boton("Reprogramar")).not.toBeInTheDocument();
    expect(boton("Confirmar cita")).not.toBeInTheDocument();
    expect(within(modal).queryByText(/\d+[.,]00/)).not.toBeInTheDocument();
    expect(within(modal).queryByRole("link")).not.toBeInTheDocument(); // sin enlace a la ficha del paciente
    expect(within(modal).getByText(`${c.duracionMin} min`)).toBeInTheDocument();
  });

  it("el administrador puede completar una cita confirmada", async () => {
    abrir(citaPor("CONFIRMADA"), "ADMINISTRADOR");
    await cargado();
    expect(boton("Marcar como completada")).toBeInTheDocument();
  });

  it("una cita completada no ofrece ninguna acción", async () => {
    abrir(citaPor("COMPLETADA"), "ADMINISTRADOR");
    await cargado();
    for (const n of ["Confirmar cita", "Reprogramar", "Cancelar cita", "Marcar como completada"]) expect(boton(n)).not.toBeInTheDocument();
  });

  it("una cita cancelada muestra el motivo y no ofrece acciones", async () => {
    const c = citaPor("CANCELADA");
    abrir(c, "ADMINISTRADOR");
    await cargado();
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Motivo de la cancelación")).toBeInTheDocument();
    expect(within(modal).getByText(c.motivoCancelacion!)).toBeInTheDocument();
    for (const n of ["Confirmar cita", "Reprogramar", "Cancelar cita", "Marcar como completada"]) expect(boton(n)).not.toBeInTheDocument();
  });

  it("confirmar envía el cambio de estado y avisa", async () => {
    const c = citaPor("PENDIENTE");
    const { api } = abrir(c, "RECEPCIONISTA", { [`PATCH /citas/${c.id}/estado`]: { body: { ...c, estado: "CONFIRMADA" } } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Confirmar cita" }));
    expect(await screen.findByText("Cita confirmada")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PATCH", `/citas/${c.id}/estado`)[0]!.init!.body))).toEqual({ estado: "CONFIRMADA" });
  });

  it("completar (profesional) envía COMPLETADA", async () => {
    const c = citaPor("CONFIRMADA");
    const { api } = abrir(c, "PROFESIONAL", { [`PATCH /citas/${c.id}/estado`]: { body: { ...c, estado: "COMPLETADA" } } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Marcar como completada" }));
    expect(await screen.findByText("Cita marcada como completada")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PATCH", `/citas/${c.id}/estado`)[0]!.init!.body))).toEqual({ estado: "COMPLETADA" });
  });

  it("cancelar pide confirmación, permite escribir un motivo y lo envía", async () => {
    const c = citaPor("CONFIRMADA");
    const { api } = abrir(c, "RECEPCIONISTA", { [`PATCH /citas/${c.id}/estado`]: { body: { ...c, estado: "CANCELADA" } } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cancelar cita" }));
    const dialogo = await screen.findByRole("dialog", { name: "¿Cancelar esta cita?" });
    expect(within(dialogo).getByText(/El horario quedará libre/)).toBeInTheDocument();
    await user.type(within(dialogo).getByLabelText("Motivo (opcional)"), "El paciente viajó");
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar cita" }));
    expect(await screen.findByText("Cita cancelada")).toBeInTheDocument();
    expect(JSON.parse(String(consultasA(api, "PATCH", `/citas/${c.id}/estado`)[0]!.init!.body))).toEqual({ estado: "CANCELADA", motivo: "El paciente viajó" });
  });

  it("«Volver» en la confirmación de cancelación no cancela nada", async () => {
    const c = citaPor("CONFIRMADA");
    const { api } = abrir(c, "RECEPCIONISTA");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cancelar cita" }));
    await user.click(within(await screen.findByRole("dialog", { name: "¿Cancelar esta cita?" })).getByRole("button", { name: "Volver" }));
    expect(await screen.findByRole("dialog", { name: /Valeria|Mateo|Camila|Sebastián|Pedro|Diego|Jorge|Sofía/ })).toBeInTheDocument();
    expect(consultasA(api, "PATCH", `/citas/${c.id}/estado`)).toHaveLength(0);
  });

  it("si el servidor rechaza el cambio, muestra su mensaje", async () => {
    const c = citaPor("PENDIENTE");
    abrir(c, "RECEPCIONISTA", { [`PATCH /citas/${c.id}/estado`]: { status: 422, body: { message: "No se puede confirmar una cita cuya hora ya pasó. Cancélala o reprográmala" } } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Confirmar cita" }));
    expect(await screen.findByText(/No se puede confirmar una cita cuya hora ya pasó/)).toBeInTheDocument();
  });

  it("reprogramar abre el formulario con la cita actual", async () => {
    const c = citaPor("CONFIRMADA");
    abrir(c, "RECEPCIONISTA");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Reprogramar" }));
    const modal = await screen.findByRole("dialog", { name: "Reprogramar cita" });
    expect(within(modal).getByText(/^Ahora:/)).toBeInTheDocument();
    expect(within(modal).queryByLabelText("Servicio")).not.toBeInTheDocument(); // el servicio no se cambia al reprogramar
    await user.click(within(modal).getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByRole("dialog", { name: /·/ })).toBeInTheDocument(); // vuelve al detalle
  });

  it("si la cita no existe muestra el error", async () => {
    const c = citaPor("PENDIENTE");
    useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol("ADMINISTRADOR"), token: "t" });
    simularApi({ [`GET /citas/${c.id}`]: { status: 404, body: { message: "Cita no encontrada" } } });
    renderConRutas([{ path: "/", element: <DetalleCita citaId={c.id} onCerrar={() => {}} /> }], "/");
    expect(await screen.findByRole("alert")).toHaveTextContent("Cita no encontrada");
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });
});
