import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import contenido from "@/test/fixtures/contenido.json";
import { usuarioPorRol } from "@/test/datos";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import Contacto from "./Contacto";

beforeEach(reiniciarEstado);
function iniciar(status = 201) {
  return simularApi({ "GET /contenido": { body: contenido }, "POST /contacto": { status, body: { message: status === 201 ? "Recibimos tu mensaje. El equipo se pondrá en contacto contigo." : "Inténtalo más tarde" } } });
}
function abrir() { renderConRutas([{ path: "/", element: <Contacto /> }]); }
async function llenar(user: ReturnType<typeof userEvent.setup>) {
  for (const [label, valor] of [["Nombre completo", "María López"], ["Correo electrónico", "maria@example.test"], ["Teléfono", "5555-1234"], ["Asunto", "Consulta de servicios"], ["Mensaje", "Quisiera información sobre atención psicológica."]]) await user.type(screen.getByLabelText(label!), valor!);
}
describe("Contacto público", () => {
  it("valida campos vacios sin enviar peticiones", async () => {
    const api = iniciar(); abrir();
    await userEvent.setup().click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    expect(await screen.findByText(/Escribe tu nombre/)).toBeInTheDocument();
  });
  it("envia sin token aunque exista sesion y confirma solo despues de guardar", async () => {
    const api = iniciar();
    useAuthStore.setState({ token: "token-personal", estado: "autenticado", usuario: usuarioPorRol("ADMINISTRADOR") });
    abrir(); const user = userEvent.setup(); await llenar(user);
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByRole("status", { name: "Confirmación del mensaje" })).toHaveTextContent("Recibimos tu mensaje");
    const [, init] = api.mock.calls.find(([, options]) => options?.method === "POST")!;
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(JSON.parse(init!.body as string).asunto).toBe("Consulta de servicios");
    expect(screen.getByLabelText("Mensaje")).toHaveValue("");
  });
  it("conserva los datos y permite reintentar cuando falla el servidor", async () => {
    iniciar(429); abrir(); const user = userEvent.setup(); await llenar(user);
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Inténtalo más tarde");
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("María López");
    expect(screen.getByLabelText("Mensaje")).toHaveValue("Quisiera información sobre atención psicológica.");
  });
  it("bloquea un segundo envio mientras el primero esta pendiente", async () => {
    const api = iniciar(); const responder = api.getMockImplementation()!;
    let terminar!: () => void;
    const pendiente = new Promise<void>(resolve => { terminar = resolve; });
    api.mockImplementation(async (input, init) => { if (init?.method === "POST") await pendiente; return responder(input, init); });
    abrir(); const user = userEvent.setup(); await llenar(user);
    await user.dblClick(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    terminar(); await waitFor(() => expect(screen.getByRole("status", { name: "Confirmación del mensaje" })).toHaveTextContent("Recibimos tu mensaje"));
  });
});
