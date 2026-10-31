import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import usuariosFixture from "@/test/fixtures/usuarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Usuario } from "@/types/api";
import Usuarios from "./Usuarios";

const rutas = [{ path: "/admin/usuarios", element: <Usuarios /> }];
const admin = usuariosFixture.find((u) => u.rol === "ADMINISTRADOR") as Usuario;
const laura = usuariosFixture.find((u) => u.nombre === "Laura Méndez") as Usuario;

let usuarios: Usuario[];

function iniciar(extra: Parameters<typeof simularApi>[0] = {}) {
  usuarios = structuredClone(usuariosFixture) as Usuario[];
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  return simularApi({ "GET /usuarios": () => ({ body: usuarios }), ...extra });
}

const llamadas = (api: ReturnType<typeof simularApi>, metodo: string, ruta: string) =>
  api.mock.calls.filter(([u, i]) => String(u).endsWith(ruta) && (i?.method ?? "GET") === metodo);

beforeEach(reiniciarEstado);

describe("Usuarios", () => {
  it("lista a todos los usuarios con su rol y estado, y marca el propio", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/usuarios");
    expect(await screen.findByText("Laura Méndez")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(7); // encabezado + 6
    expect(screen.getByText("(tú)")).toBeInTheDocument();
    expect(screen.getAllByText("Activo")).toHaveLength(6);
  });

  it("no permite desactivarse a uno mismo", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/usuarios");
    expect(await screen.findByRole("button", { name: "Desactivar a Administrador SIGCA" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desactivar a Laura Méndez" })).toBeEnabled();
  });

  it("busca ignorando tildes y mayúsculas, y filtra por rol", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await screen.findByText("Laura Méndez");

    await user.type(screen.getByLabelText("Buscar por nombre o correo"), "MENDEZ");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Laura Méndez")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Buscar por nombre o correo"));
    await user.selectOptions(screen.getByLabelText("Filtrar por rol"), "PROFESIONAL");
    expect(screen.getAllByRole("row")).toHaveLength(4); // 3 profesionales
  });

  it("sin coincidencias ofrece quitar los filtros", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await screen.findByText("Laura Méndez");
    await user.type(screen.getByLabelText("Buscar por nombre o correo"), "zzzz");
    expect(screen.getByText("Ningún usuario coincide con los filtros")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getAllByRole("row")).toHaveLength(7);
  });

  it("crear: valida los campos antes de enviar", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const modal = await screen.findByRole("dialog", { name: "Nuevo usuario" });

    await user.click(within(modal).getByRole("button", { name: "Crear usuario" }));
    expect(await within(modal).findByText(/Escribe el nombre completo/)).toBeInTheDocument();
    expect(within(modal).getByText("Escribe el correo electrónico")).toBeInTheDocument();
    expect(within(modal).getByText("Mínimo 8 caracteres", { selector: "p.text-danger" })).toBeInTheDocument();
    expect(llamadas(api, "POST", "/usuarios")).toHaveLength(0);
  });

  it("crear: contraseña sin número es rechazada", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const modal = await screen.findByRole("dialog");
    await user.type(within(modal).getByLabelText("Contraseña inicial"), "sololetrasaqui");
    await user.tab();
    expect(await within(modal).findByText("Debe incluir al menos un número")).toBeInTheDocument();
  });

  it("crear: envía los datos limpios, avisa, cierra el formulario y recarga la lista", async () => {
    const api = iniciar({
      "POST /usuarios": (init) => {
        const cuerpo = JSON.parse(String(init?.body));
        const nuevo = { ...cuerpo, id: "nuevo1", activo: true, createdAt: "", updatedAt: "" };
        delete nuevo.password;
        usuarios.push(nuevo);
        return { status: 201, body: nuevo };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const modal = await screen.findByRole("dialog");

    await user.type(within(modal).getByLabelText("Nombre completo"), "  Pedro Gómez ");
    await user.type(within(modal).getByLabelText("Correo electrónico"), "pedro@sigca.test");
    await user.selectOptions(within(modal).getByLabelText("Rol"), "PROFESIONAL");
    await user.type(within(modal).getByLabelText("Contraseña inicial"), "Clave1234");
    await user.click(within(modal).getByRole("button", { name: "Crear usuario" }));

    expect(await screen.findByText("Usuario creado")).toBeInTheDocument();
    expect(JSON.parse(String(llamadas(api, "POST", "/usuarios")[0]![1]!.body))).toEqual({
      nombre: "Pedro Gómez", email: "pedro@sigca.test", rol: "PROFESIONAL", password: "Clave1234",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Pedro Gómez")).toBeInTheDocument();
  });

  it("crear: un correo repetido se muestra bajo el campo correo y el formulario sigue abierto", async () => {
    iniciar({ "POST /usuarios": { status: 409, body: { message: "Ya existe un usuario con ese correo electrónico" } } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const modal = await screen.findByRole("dialog");

    await user.type(within(modal).getByLabelText("Nombre completo"), "Otra Laura");
    await user.type(within(modal).getByLabelText("Correo electrónico"), "recepcion1@sigca.test");
    await user.type(within(modal).getByLabelText("Contraseña inicial"), "Clave1234");
    await user.click(within(modal).getByRole("button", { name: "Crear usuario" }));

    expect(await within(modal).findByText("Ya existe un usuario con ese correo electrónico")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("Usuario creado")).not.toBeInTheDocument();
  });

  it("editar: carga los datos actuales, no pide contraseña y envía solo nombre, correo y rol", async () => {
    const api = iniciar({ [`PUT /usuarios/${laura.id}`]: (init) => ({ body: { ...laura, ...JSON.parse(String(init?.body)) } }) });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Editar a Laura Méndez" }));
    const modal = await screen.findByRole("dialog", { name: "Editar usuario" });

    expect(within(modal).getByLabelText("Nombre completo")).toHaveValue("Laura Méndez");
    expect(within(modal).queryByLabelText("Contraseña inicial")).not.toBeInTheDocument();

    await user.clear(within(modal).getByLabelText("Nombre completo"));
    await user.type(within(modal).getByLabelText("Nombre completo"), "Laura M. Méndez");
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    expect(JSON.parse(String(llamadas(api, "PUT", `/usuarios/${laura.id}`)[0]![1]!.body))).toEqual({
      nombre: "Laura M. Méndez", email: laura.email, rol: "RECEPCIONISTA",
    });
  });

  it("desactivar: pide confirmación y no hace nada si se cancela", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Desactivar a Laura Méndez" }));
    const confirmacion = await screen.findByRole("dialog", { name: "¿Desactivar a Laura Méndez?" });
    await user.click(within(confirmacion).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(llamadas(api, "PATCH", `/usuarios/${laura.id}/estado`)).toHaveLength(0);
  });

  it("desactivar: al confirmar envía activo=false y avisa", async () => {
    const api = iniciar({
      [`PATCH /usuarios/${laura.id}/estado`]: (init) => {
        const activo = JSON.parse(String(init?.body)).activo;
        usuarios = usuarios.map((u) => (u.id === laura.id ? { ...u, activo } : u));
        return { body: { ...laura, activo } };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Desactivar a Laura Méndez" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Desactivar usuario" }));

    expect(await screen.findByText("Laura Méndez fue desactivado")).toBeInTheDocument();
    expect(JSON.parse(String(llamadas(api, "PATCH", `/usuarios/${laura.id}/estado`)[0]![1]!.body))).toEqual({ activo: false });
    // la lista se recarga: ahora ofrece activarla
    expect(await screen.findByRole("button", { name: "Activar a Laura Méndez" })).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("restablecer contraseña: valida que coincidan y envía la nueva", async () => {
    const api = iniciar({ [`PATCH /usuarios/${laura.id}/password`]: { body: { message: "ok" } } });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Restablecer contraseña de Laura Méndez" }));
    const modal = await screen.findByRole("dialog", { name: "Restablecer contraseña" });

    await user.type(within(modal).getByLabelText("Contraseña nueva"), "NuevaClave99");
    await user.type(within(modal).getByLabelText("Repite la contraseña nueva"), "OtraClave99");
    await user.click(within(modal).getByRole("button", { name: "Restablecer contraseña" }));
    expect(await within(modal).findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(llamadas(api, "PATCH", `/usuarios/${laura.id}/password`)).toHaveLength(0);

    await user.clear(within(modal).getByLabelText("Repite la contraseña nueva"));
    await user.type(within(modal).getByLabelText("Repite la contraseña nueva"), "NuevaClave99");
    await user.click(within(modal).getByRole("button", { name: "Restablecer contraseña" }));

    expect(await screen.findByText("Contraseña restablecida para Laura Méndez")).toBeInTheDocument();
    expect(JSON.parse(String(llamadas(api, "PATCH", `/usuarios/${laura.id}/password`)[0]![1]!.body))).toEqual({ password: "NuevaClave99" });
  });

  it("el botón del ojo muestra y oculta la contraseña", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/usuarios");
    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const modal = await screen.findByRole("dialog");
    const campo = within(modal).getByLabelText("Contraseña inicial");
    expect(campo).toHaveAttribute("type", "password");
    await user.click(within(modal).getByRole("button", { name: "Mostrar contraseña" }));
    expect(campo).toHaveAttribute("type", "text");
    await user.click(within(modal).getByRole("button", { name: "Ocultar contraseña" }));
    expect(campo).toHaveAttribute("type", "password");
  });
});
