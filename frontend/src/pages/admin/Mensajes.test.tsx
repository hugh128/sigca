import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import Mensajes from "./Mensajes";

const mensaje = { id: "m1", nombre: "María López", correo: "maria@example.test", telefono: "5555-1234", asunto: "Consulta de servicios", mensaje: "Texto completo <script>alert('prueba')</script>", fecha: "2026-10-31T16:00:00Z" };
beforeEach(reiniciarEstado);
describe("Bandeja de mensajes", () => {
  it("consulta paginas y muestra el mensaje completo como texto", async () => {
    const api = simularApi({ "GET /contacto": (_init, url) => ({ body: { items: [{ ...mensaje, id: url.searchParams.get("page") ?? "1" }], total: 16, page: Number(url.searchParams.get("page") ?? 1), limit: 15, pages: 2 } }) });
    const { container } = renderConRutas([{ path: "/", element: <Mensajes /> }]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Leer mensaje: Consulta de servicios" }));
    const modal = await screen.findByRole("dialog", { name: "Consulta de servicios" });
    expect(within(modal).getByText(mensaje.mensaje)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(within(modal).getByRole("link", { name: mensaje.correo })).toHaveAttribute("href", `mailto:${mensaje.correo}`);
    await user.click(within(modal).getByRole("button", { name: "Cerrar" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText(/Página 2 de 2/)).toBeInTheDocument();
    expect(api.mock.calls.some(([url]) => new URL(String(url)).searchParams.get("page") === "2")).toBe(true);
  });
  it("muestra un estado vacio", async () => {
    simularApi({ "GET /contacto": { body: { items: [], total: 0, page: 1, limit: 15, pages: 1 } } });
    renderConRutas([{ path: "/", element: <Mensajes /> }]);
    expect(await screen.findByText("Todavía no hay mensajes")).toBeInTheDocument();
  });
  it("avisa si falla la consulta", async () => {
    simularApi({ "GET /contacto": { status: 500, body: { message: "No pudimos cargar los mensajes" } } });
    renderConRutas([{ path: "/", element: <Mensajes /> }]);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar los mensajes");
  });
});
