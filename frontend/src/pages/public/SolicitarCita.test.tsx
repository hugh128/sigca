import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { hoyGuatemala } from "@/lib/fechas";
import { useAuthStore } from "@/store/auth";
import servicios from "@/test/fixtures/servicios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import SolicitarCita from "./SolicitarCita";

beforeEach(reiniciarEstado);
const fecha = () => `${Number(hoyGuatemala().slice(0, 4)) + 1}-01-05`;
function iniciar(status = 201) {
  return simularApi({ "GET /servicios": { body: servicios }, "POST /solicitudes-cita": { status, body: { message: status === 201 ? "Recibimos tu solicitud. La fecha todavía no está reservada." : "El servicio está inactivo" } } });
}
describe("Solicitar cita", () => {
  it("preselecciona el servicio de la URL y envia sin reservar ni usar token", async () => {
    const api = iniciar(); useAuthStore.setState({ token: "personal" });
    renderConRutas([{ path: "/solicitar-cita", element: <SolicitarCita /> }], `/solicitar-cita?servicio=${servicios[0]!.id}`);
    expect(await screen.findByDisplayValue(servicios[0]!.nombre)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nombre completo"), "María López");
    await user.type(screen.getByLabelText("Correo electrónico"), "maria@example.test");
    await user.type(screen.getByLabelText("Teléfono"), "5555-1234");
    fireEvent.change(screen.getByLabelText("Fecha preferida"), { target: { value: fecha() } });
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("status", { name: "Solicitud recibida" })).toHaveTextContent("todavía no está reservada");
    const [, init] = api.mock.calls.find(([, o]) => o?.method === "POST")!;
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(JSON.parse(init!.body as string)).toMatchObject({ servicioId: servicios[0]!.id, fechaPreferida: fecha() });
    expect(api.mock.calls.some(([url]) => String(url).includes("/citas/"))).toBe(false);
  });
  it("muestra validacion sin enviar si faltan datos", async () => {
    const api = iniciar(); renderConRutas([{ path: "/", element: <SolicitarCita /> }]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByText("Escribe tu nombre")).toBeInTheDocument();
    expect(api.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(0);
  });
});
