import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import contenido from "@/test/fixtures/contenido.json";
import login from "@/test/fixtures/login.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import Login from "./Login";

const rutas = [
  { path: "/admin/login", element: <Login /> },
  { path: "/admin", element: <p>Panel de prueba</p> },
];

beforeEach(reiniciarEstado);

describe("Login", () => {
  it("al enviar vacío muestra un mensaje bajo cada campo y no llama a la API", async () => {
    const api = simularApi({ "GET /contenido": { body: contenido } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/login");

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Escribe tu correo electrónico")).toBeInTheDocument();
    expect(screen.getByText("Escribe tu contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
    expect(api.mock.calls.some(([u, i]) => String(u).includes("/auth/login") && i?.method === "POST")).toBe(false);
  });

  it("valida el formato del correo al salir del campo", async () => {
    simularApi({ "GET /contenido": { body: contenido } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/login");

    await user.type(screen.getByLabelText("Correo electrónico"), "no-es-un-correo");
    await user.tab();

    expect(await screen.findByText(/Escribe un correo válido/)).toBeInTheDocument();
  });

  it("con credenciales correctas guarda la sesión, avisa y entra al panel", async () => {
    simularApi({
      "GET /contenido": { body: contenido },
      "POST /auth/login": (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({ email: "admin@sigca.test", password: "Sigca2026!" });
        return { body: login };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/login");

    await user.type(screen.getByLabelText("Correo electrónico"), "  admin@sigca.test ");
    await user.type(screen.getByLabelText("Contraseña"), "Sigca2026!");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Panel de prueba")).toBeInTheDocument();
    expect(await screen.findByText(/Bienvenido, Administrador/)).toBeInTheDocument();
    const s = useAuthStore.getState();
    expect(s.estado).toBe("autenticado");
    expect(s.usuario?.rol).toBe("ADMINISTRADOR");
    expect(localStorage.getItem("sigca.token")).toBe(login.token);
  });

  it("con credenciales incorrectas muestra el mensaje del servidor y se queda en el login", async () => {
    simularApi({
      "GET /contenido": { body: contenido },
      "POST /auth/login": { status: 401, body: { message: "Credenciales inválidas" } },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/login");

    await user.type(screen.getByLabelText("Correo electrónico"), "admin@sigca.test");
    await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciales inválidas");
    expect(screen.queryByText("Panel de prueba")).not.toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().estado).toBe("anonimo"));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
  });

  it("avisa cuando la sesión anterior terminó", async () => {
    simularApi({ "GET /contenido": { body: contenido } });
    useAuthStore.setState({ sesionExpirada: true });
    renderConRutas(rutas, "/admin/login");
    expect(await screen.findByText(/Tu sesión terminó/)).toBeInTheDocument();
  });
});
