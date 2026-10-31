import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicLayout } from "@/layouts/PublicLayout";
import contenido from "@/test/fixtures/contenido.json";
import horarios from "@/test/fixtures/horarios.json";
import servicios from "@/test/fixtures/servicios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import Corporativo from "./Corporativo";
import Educativo from "./Educativo";
import Horarios from "./Horarios";
import Inicio from "./Inicio";
import MisionVision from "./MisionVision";
import Servicios from "./Servicios";

// Las fixtures son respuestas reales de la API (ver backend: npm run seed)
const rutas = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: "mision-vision", element: <MisionVision /> },
      { path: "servicios", element: <Servicios /> },
      { path: "contenido-educativo", element: <Educativo /> },
      { path: "corporativo", element: <Corporativo /> },
      { path: "horarios", element: <Horarios /> },
    ],
  },
];

beforeEach(() => {
  reiniciarEstado();
  simularApi({
    "GET /contenido": { body: contenido },
    "GET /servicios": { body: servicios },
    "GET /horarios": { body: horarios },
  });
});

describe("Portal público", () => {
  it("la portada muestra el contenido editable de la API", async () => {
    renderConRutas(rutas, "/");
    expect(await screen.findByRole("heading", { level: 1, name: contenido.inicio.titulo })).toBeInTheDocument();
    expect(screen.getAllByText(contenido.general.nombreCentro).length).toBeGreaterThan(0);
    expect(screen.getByText(contenido.misionVision.mision)).toBeInTheDocument();
  });

  it("el carrusel muestra al menos 5 imágenes con controles accesibles", async () => {
    renderConRutas(rutas, "/");
    const carrusel = await screen.findByRole("group", { name: "Imágenes del centro" });
    expect(within(carrusel).getAllByRole("img", { hidden: true }).length).toBeGreaterThanOrEqual(5);
    expect(within(carrusel).getByRole("button", { name: "Imagen siguiente" })).toBeInTheDocument();
    expect(within(carrusel).getByRole("button", { name: "Ir a la imagen 3 de 5" })).toBeInTheDocument();
  });

  it("lista servicios sin mostrar precios al visitante", async () => {
    renderConRutas(rutas, "/servicios");
    expect(await screen.findByText("Atención psicológica")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText(/Q\s?\d/)).not.toBeInTheDocument();
    expect(screen.getByText("50 min")).toBeInTheDocument();
  });

  it("resume los horarios por días consecutivos", async () => {
    renderConRutas(rutas, "/");
    expect((await screen.findAllByText("Lunes a viernes")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Domingo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin atención").length).toBeGreaterThan(0);
  });

  it("la página de horarios muestra los 7 días", async () => {
    renderConRutas(rutas, "/horarios");
    const tabla = await screen.findByRole("table");
    expect(within(tabla).getAllByRole("row")).toHaveLength(8); // encabezado + 7 dias
  });

  it("misión y visión muestra ambos textos", async () => {
    renderConRutas(rutas, "/mision-vision");
    expect(await screen.findByText(contenido.misionVision.vision)).toBeInTheDocument();
    expect(screen.getByText(contenido.misionVision.mision)).toBeInTheDocument();
  });

  it("contenido educativo: publicaciones de la más reciente a la más antigua, con fecha legible", async () => {
    renderConRutas(rutas, "/contenido-educativo");
    await screen.findByRole("heading", { level: 1, name: "Contenido educativo" });
    // solo el contenido principal (el pie de página también tiene encabezados h2)
    const titulos = within(screen.getByRole("main")).getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(contenido.educativo.publicaciones.map((p) => p.titulo));
    expect(screen.getByText(/15 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Leer más sobre/ })).toHaveAttribute("rel", "noreferrer");
  });

  it("corporativo: muestra capacitaciones y escuela para padres con sus actividades", async () => {
    renderConRutas(rutas, "/corporativo");
    expect(await screen.findByRole("heading", { level: 2, name: "Capacitaciones" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Escuela para padres" })).toBeInTheDocument();
    expect(screen.getByText(contenido.corporativo.capacitaciones.actividades[0]!.titulo)).toBeInTheDocument();
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(2);
  });

  it("el menú del portal enlaza todas las páginas", async () => {
    renderConRutas(rutas, "/");
    const menu = (await screen.findAllByRole("navigation", { name: "Principal" }))[0]!;
    expect(within(menu).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Inicio", "Misión y visión", "Servicios", "Contenido educativo", "Corporativo", "Horarios", "Contacto",
    ]);
  });

  it("si la API falla muestra el error y permite reintentar", async () => {
    simularApi({ "GET /contenido": { status: 500, body: { message: "Error interno del servidor" } }, "GET /servicios": { body: [] }, "GET /horarios": { body: horarios } });
    renderConRutas(rutas, "/");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno del servidor");
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
  });
});
