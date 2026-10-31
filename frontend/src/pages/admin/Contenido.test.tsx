import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import contenidoFixture from "@/test/fixtures/contenido.json";
import usuarios from "@/test/fixtures/usuarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Contenido as ContenidoApi, Usuario } from "@/types/api";
import Contenido from "./Contenido";

const rutas = [{ path: "/admin/contenido", element: <Contenido /> }];
const admin = usuarios.find((u) => u.rol === "ADMINISTRADOR") as Usuario;

let contenido: ContenidoApi;

function iniciar(extra: Parameters<typeof simularApi>[0] = {}) {
  contenido = structuredClone(contenidoFixture) as ContenidoApi;
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  return simularApi({ "GET /contenido": () => ({ body: contenido }), ...extra });
}

const puts = (api: ReturnType<typeof simularApi>, clave: string) =>
  api.mock.calls.filter(([u, i]) => String(u).endsWith(`/contenido/${clave}`) && i?.method === "PUT");
const cuerpo = (llamada: ReturnType<typeof puts>[number]) => JSON.parse(String(llamada[1]!.body));
const eco = (clave: string) => ({
  [`PUT /contenido/${clave}`]: (init: RequestInit | undefined) => ({ body: JSON.parse(String(init?.body)) }),
});

beforeEach(reiniciarEstado);

describe("Editor de contenido", () => {
  it("muestra las 6 secciones y abre General por defecto con sus datos", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/contenido");
    const nav = await screen.findByRole("navigation", { name: "Secciones del contenido" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "General", "Inicio", "Misión y visión", "Contacto", "Corporativo", "Contenido educativo",
    ]);
    expect(within(nav).getByRole("link", { name: "General" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByLabelText("Nombre del centro")).toHaveValue(contenido.general.nombreCentro);
  });

  it("un enlace directo ?seccion=contacto abre esa sección", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/contenido?seccion=contacto");
    expect(await screen.findByLabelText("Teléfono")).toHaveValue(contenido.contacto.telefono);
  });

  it("guardar y descartar solo se habilitan cuando hay cambios", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=misionVision");
    const mision = await screen.findByLabelText("Misión");
    const guardar = screen.getByRole("button", { name: "Guardar cambios" });
    const descartar = screen.getByRole("button", { name: "Descartar cambios" });
    expect(guardar).toBeDisabled();
    expect(descartar).toBeDisabled();

    await user.type(mision, " Texto nuevo.");
    expect(guardar).toBeEnabled();
    expect(screen.getByText("Hay cambios sin guardar")).toBeInTheDocument();

    await user.click(descartar);
    expect(mision).toHaveValue(contenido.misionVision.mision);
    expect(guardar).toBeDisabled();
  });

  it("edita la misión: envía la sección completa, avisa y queda sin cambios pendientes", async () => {
    const api = iniciar(eco("misionVision"));
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=misionVision");
    const mision = await screen.findByLabelText("Misión");
    await user.clear(mision);
    await user.type(mision, "Nueva misión del centro");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/Cambios guardados/)).toBeInTheDocument();
    expect(cuerpo(puts(api, "misionVision")[0]!)).toEqual({ mision: "Nueva misión del centro", vision: contenido.misionVision.vision });
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled());
    expect(screen.queryByText("Hay cambios sin guardar")).not.toBeInTheDocument();
  });

  it("no envía nada si un campo obligatorio queda vacío", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=misionVision");
    await user.clear(await screen.findByLabelText("Visión"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Escribe la visión")).toBeInTheDocument();
    expect(puts(api, "misionVision")).toHaveLength(0);
  });

  it("contacto: rechaza un correo inválido", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=contacto");
    const correo = await screen.findByLabelText("Correo electrónico");
    await user.clear(correo);
    await user.type(correo, "no-es-correo");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText(/Escribe un correo válido/)).toBeInTheDocument();
    expect(puts(api, "contacto")).toHaveLength(0);
  });

  it("inicio: el carrusel exige al menos 5 imágenes", async () => {
    const api = iniciar(eco("inicio"));
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=inicio");
    await screen.findByRole("group", { name: "Imagen 5" });

    await user.click(screen.getByRole("button", { name: "Quitar: Imagen 5" }));
    expect(screen.queryByRole("group", { name: "Imagen 5" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("El carrusel necesita al menos 5 imágenes")).toBeInTheDocument();
    expect(puts(api, "inicio")).toHaveLength(0);

    // se corrige agregando otra imagen
    await user.click(screen.getByRole("button", { name: "Agregar imagen" }));
    const nueva = await screen.findByRole("group", { name: "Imagen 5" });
    await user.click(within(nueva).getByRole("button", { name: "Usar una dirección web" }));
    await user.type(within(nueva).getByLabelText("Dirección web de la imagen (Imagen 5)"), "https://example.com/nueva.jpg");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/Cambios guardados/)).toBeInTheDocument();
    const enviado = cuerpo(puts(api, "inicio")[0]!);
    expect(enviado.carrusel).toHaveLength(5);
    expect(enviado.carrusel[4].url).toBe("https://example.com/nueva.jpg");
    expect(enviado.carrusel.every((i: { id: string }) => i.id)).toBe(true);
  });

  it("inicio: se puede reordenar el carrusel", async () => {
    const api = iniciar(eco("inicio"));
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=inicio");
    await screen.findByRole("group", { name: "Imagen 2" });
    const idsOriginales = contenido.inicio.carrusel.map((i) => i.id);

    expect(screen.queryByRole("button", { name: "Subir: Imagen 1" })).not.toBeInTheDocument(); // la primera no sube
    await user.click(screen.getByRole("button", { name: "Subir: Imagen 2" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await screen.findByText(/Cambios guardados/);
    const ids = cuerpo(puts(api, "inicio")[0]!).carrusel.map((i: { id: string }) => i.id);
    expect(ids).toEqual([idsOriginales[1], idsOriginales[0], ...idsOriginales.slice(2)]);
  });

  it("un error del servidor sobre una imagen se muestra bajo el campo de esa imagen", async () => {
    iniciar({
      "PUT /contenido/inicio": { status: 400, body: { message: "Datos inválidos", errors: [{ campo: "carrusel.1.url", mensaje: "La imagen ya no está disponible" }] } },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=inicio");
    const titulo = await screen.findByLabelText("Título de la portada");
    await user.type(titulo, "!");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const segunda = await screen.findByRole("group", { name: "Imagen 2" });
    expect(await within(segunda).findByText("La imagen ya no está disponible")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Imagen 1" })).queryByText("La imagen ya no está disponible")).not.toBeInTheDocument();
  });

  it("educativo: agrega una publicación con fecha de hoy y exige título y contenido", async () => {
    const api = iniciar(eco("educativo"));
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=educativo");
    await screen.findByRole("group", { name: "Publicación 3" });

    await user.click(screen.getByRole("button", { name: "Agregar publicación" }));
    const nueva = await screen.findByRole("group", { name: "Publicación 4" });
    expect(within(nueva).getByLabelText("Fecha de publicación")).toHaveValue(new Date().toLocaleDateString("sv-SE"));

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await within(nueva).findByText("Escribe el título de la publicación")).toBeInTheDocument();
    expect(within(nueva).getByText("Escribe el contenido de la publicación")).toBeInTheDocument();
    expect(puts(api, "educativo")).toHaveLength(0);

    await user.type(within(nueva).getByLabelText("Título"), "Consejos de lectura");
    await user.type(within(nueva).getByLabelText("Contenido"), "Leer juntos cada noche.");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText(/Cambios guardados/);
    const enviado = cuerpo(puts(api, "educativo")[0]!);
    expect(enviado.publicaciones).toHaveLength(4);
    expect(enviado.publicaciones[3]).toMatchObject({ titulo: "Consejos de lectura", imagenUrl: "", enlaceUrl: "" });
  });

  it("educativo: quitar una publicación", async () => {
    const api = iniciar(eco("educativo"));
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=educativo");
    await user.click(await screen.findByRole("button", { name: "Quitar: Publicación 1" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText(/Cambios guardados/);
    expect(cuerpo(puts(api, "educativo")[0]!).publicaciones).toHaveLength(2);
  });

  it("corporativo: agrega una actividad a la escuela para padres", async () => {
    const api = iniciar(eco("corporativo"));
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=corporativo");
    await screen.findByRole("heading", { name: "Escuela para padres" });
    const botones = screen.getAllByRole("button", { name: "Agregar actividad" });
    await user.click(botones[1]!); // segundo bloque

    const nueva = await screen.findByRole("group", { name: "Escuela para padres: actividad 3" });
    await user.type(within(nueva).getByLabelText("Título de la actividad"), "Taller de hábitos");
    await user.type(within(nueva).getByLabelText("Descripción de la actividad"), "Rutinas de sueño");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await screen.findByText(/Cambios guardados/);
    const enviado = cuerpo(puts(api, "corporativo")[0]!);
    expect(enviado.escuelaPadres.actividades).toHaveLength(3);
    expect(enviado.capacitaciones.actividades).toHaveLength(contenido.corporativo.capacitaciones.actividades.length);
  });

  it("avisa antes de cambiar de sección con cambios sin guardar", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido?seccion=misionVision");
    await user.type(await screen.findByLabelText("Misión"), " editada");

    await user.click(screen.getByRole("link", { name: "Contacto" }));
    const aviso = await screen.findByRole("dialog", { name: "Tienes cambios sin guardar" });
    await user.click(within(aviso).getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Misión")).toHaveValue(contenido.misionVision.mision + " editada");

    await user.click(screen.getByRole("link", { name: "Contacto" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Salir sin guardar" }));
    expect(await screen.findByLabelText("Teléfono")).toBeInTheDocument();
  });

  it("sin cambios, cambiar de sección no pide confirmación", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/contenido");
    await screen.findByLabelText("Nombre del centro");
    await user.click(screen.getByRole("link", { name: "Contacto" }));
    expect(await screen.findByLabelText("Teléfono")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si falla la carga muestra el error con opción de reintentar", async () => {
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    simularApi({ "GET /contenido": { status: 500, body: { message: "Error interno del servidor" } } });
    renderConRutas(rutas, "/admin/contenido");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno del servidor");
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
  });
});
