import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { citasFixture, pacientesFixture, profesionalesFixture, usuarioPorRol } from "@/test/datos";
import servicios from "@/test/fixtures/servicios-admin.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { SolicitudCita } from "@/types/api";
import Solicitudes from "./Solicitudes";

const paciente = pacientesFixture.find(p => !p.esMenor && p.estado === "ACTIVO")!;
const servicio = servicios[0]!;
const inicial: SolicitudCita = { id: "sol1", nombre: "María López", correo: "maria@example.test", telefono: "5555-1234", servicio: { ...servicio, estado: "ACTIVO" }, fechaPreferida: "2099-01-05", mensaje: "Información de servicios", estado: "PENDIENTE", createdAt: "2026-10-31T16:00:00Z" };
beforeEach(reiniciarEstado);
function iniciar(solicitud = inicial) {
  let actual = structuredClone(solicitud);
  useAuthStore.setState({ token: "t", estado: "autenticado", usuario: usuarioPorRol("RECEPCIONISTA") });
  const cita = { ...citasFixture[0]!, paciente, servicio, profesional: profesionalesFixture[0]!, estado: "PENDIENTE" as const };
  const api = simularApi({
    "GET /solicitudes-cita": (_i, url) => ({ body: { items: !url.searchParams.get("estado") || url.searchParams.get("estado") === actual.estado ? [actual] : [], total: 1, page: 1, limit: 15, pages: 1 } }),
    "GET /solicitudes-cita/sol1": () => ({ body: actual }),
    "PATCH /solicitudes-cita/sol1/rechazar": init => { actual = { ...actual, estado: "RECHAZADA", motivoRechazo: JSON.parse(init!.body as string).motivo }; return { body: actual }; },
    "POST /solicitudes-cita/sol1/convertir": () => { actual = { ...actual, estado: "ATENDIDA", cita }; return { status: 201, body: actual }; },
    "GET /pacientes": async () => {
      // La disponibilidad puede refrescarse antes que las otras consultas invalidadas.
      if (actual.estado === "ATENDIDA") await new Promise(resolve => setTimeout(resolve, 80));
      return { body: { items: [paciente], total: 1, page: 1, limit: 6, pages: 1 } };
    },
    "GET /servicios": { body: servicios },
    "GET /usuarios/profesionales": { body: profesionalesFixture },
    "GET /citas/disponibilidad": () => ({ body: { fecha: inicial.fechaPreferida, duracionMin: 50, horarios: actual.estado === "ATENDIDA" ? [] : [{ horaInicio: "08:00", horaFin: "08:50" }] } }),
    [`GET /citas/${cita.id}`]: { body: cita },
  });
  renderConRutas([{ path: "/", element: <Solicitudes /> }]);
  return api;
}
describe("Solicitudes administrativas", () => {
  it("filtra por estado y consulta el detalle", async () => {
    const api = iniciar(); const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Revisar solicitud de María López" }));
    const modal = await screen.findByRole("dialog", { name: "Solicitud de cita" });
    expect(await within(modal).findByRole("link", { name: inicial.correo })).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "Cerrar" }));
    await user.selectOptions(screen.getByLabelText("Estado"), "ATENDIDA");
    expect(await screen.findByText("No hay solicitudes con este estado")).toBeInTheDocument();
    expect(api.mock.calls.some(([url]) => String(url).includes("estado=ATENDIDA"))).toBe(true);
  });
  it("rechaza con motivo y muestra el estado final sin acciones de conversion", async () => {
    iniciar(); const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Revisar solicitud de María López" }));
    await user.click(await screen.findByRole("button", { name: "Rechazar solicitud" }));
    await user.type(screen.getByLabelText("Motivo (opcional)"), "El solicitante desistió");
    await user.click(screen.getByRole("button", { name: "Rechazar solicitud" }));
    expect(await screen.findByText("Motivo: El solicitante desistió")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convertir en cita" })).not.toBeInTheDocument();
  });
  it("convierte con el formulario de citas y no usa POST /citas", async () => {
    const api = iniciar(); const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Revisar solicitud de María López" }));
    await user.click(await screen.findByRole("button", { name: "Convertir en cita" }));
    expect(screen.queryByLabelText("Servicio")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Registrar paciente en otra pestaña/ })).toHaveAttribute("target", "_blank");
    await user.click(await screen.findByRole("button", { name: `Elegir a ${paciente.nombres} ${paciente.apellidos}` }));
    await screen.findByRole("option", { name: profesionalesFixture[0]!.nombre });
    await user.selectOptions(screen.getByLabelText("Profesional"), profesionalesFixture[0]!.id);
    await user.click(await screen.findByRole("radio", { name: /8:00.*8:50/ }));
    await user.click(screen.getByRole("button", { name: "Convertir en cita" }));
    expect(await screen.findByRole("dialog", { name: `${paciente.nombres} ${paciente.apellidos} · ${servicio.nombre}` })).toBeInTheDocument();
    const post = api.mock.calls.find(([url, o]) => String(url).includes("/convertir") && o?.method === "POST")!;
    expect(JSON.parse(post[1]!.body as string)).toMatchObject({ pacienteId: paciente.id, profesionalId: profesionalesFixture[0]!.id, fecha: "2099-01-05", horaInicio: "08:00" });
    expect(JSON.parse(post[1]!.body as string).servicioId).toBeUndefined();
    expect(api.mock.calls.some(([url, o]) => String(url).endsWith("/citas") && o?.method === "POST")).toBe(false);
  });
  it("explica por que un servicio inactivo no puede convertirse", async () => {
    iniciar({ ...inicial, servicio: { ...inicial.servicio, estado: "INACTIVO" } });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Revisar solicitud de María López" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El servicio está inactivo");
    expect(screen.getByRole("button", { name: "Convertir en cita" })).toBeDisabled();
  });
});
