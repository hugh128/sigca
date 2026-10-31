import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import contenidoFixture from "@/test/fixtures/contenido.json";
import serviciosFixture from "@/test/fixtures/servicios-admin.json";
import usuarios from "@/test/fixtures/usuarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Contenido as ContenidoApi, Servicio, Usuario } from "@/types/api";
import Contenido from "@/pages/admin/Contenido";
import ServiciosAdmin from "@/pages/admin/ServiciosAdmin";

const admin = usuarios.find((u) => u.rol === "ADMINISTRADOR") as Usuario;
const subidaOk = { url: "http://localhost:4000/uploads/general/2026/abc.webp", key: "general/2026/abc.webp", ancho: 400, alto: 300, bytes: 9000 };
const archivo = (nombre = "logo.png", tipo = "image/png", bytes = 1024) => new File([new Uint8Array(bytes)], nombre, { type: tipo });

let contenido: ContenidoApi;

function iniciar(extra: Parameters<typeof simularApi>[0] = {}) {
  contenido = structuredClone(contenidoFixture) as ContenidoApi;
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  return simularApi({
    "GET /contenido": () => ({ body: contenido }),
    "PUT /contenido/general": (init) => ({ body: JSON.parse(String(init?.body)) }),
    ...extra,
  });
}
const rutasContenido = [{ path: "/admin/contenido", element: <Contenido /> }];
const subidas = (api: ReturnType<typeof simularApi>) => api.mock.calls.filter(([u, i]) => String(u).endsWith("/uploads") && i?.method === "POST");
const puts = (api: ReturnType<typeof simularApi>, ruta: string) => api.mock.calls.filter(([u, i]) => String(u).endsWith(ruta) && i?.method === "PUT");

beforeEach(reiniciarEstado);

describe("ControlImagen (subida de imágenes)", () => {
  it("sube el logo: envía carpeta y archivo, muestra la miniatura y guarda URL y llave", async () => {
    const api = iniciar({
      "POST /uploads": (init) => {
        const fd = init?.body as FormData;
        expect(fd.get("carpeta")).toBe("general");
        expect((fd.get("archivo") as File).name).toBe("logo.png");
        return { status: 201, body: subidaOk };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    const entrada = await screen.findByLabelText("Archivo de imagen: Logo");

    await user.upload(entrada, archivo());
    expect(await screen.findByText(/Imagen subida/)).toBeInTheDocument();
    expect(document.querySelector(`img[src="${subidaOk.url}"]`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cambiar imagen/ })).toBeInTheDocument();
    expect(screen.getByText("Hay cambios sin guardar")).toBeInTheDocument(); // subir no publica: hay que guardar

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText(/Cambios guardados/);
    const cuerpo = JSON.parse(String(puts(api, "/contenido/general")[0]![1]!.body));
    expect(cuerpo).toMatchObject({ logoUrl: subidaOk.url, logoKey: subidaOk.key });
    expect(subidas(api)).toHaveLength(1);
  });

  it("muestra «Subiendo…» y bloquea el botón mientras se sube", async () => {
    let liberar!: () => void;
    const api = iniciar();
    api.mockImplementation(async (input, init) => {
      const ruta = `${init?.method ?? "GET"} ${new URL(String(input)).pathname.replace(/^\/api/, "")}`;
      if (ruta === "POST /uploads") await new Promise<void>((ok) => (liberar = ok));
      const cuerpo = ruta === "POST /uploads" ? subidaOk : ruta === "GET /contenido" ? contenido : null;
      return new Response(JSON.stringify(cuerpo), { status: ruta === "POST /uploads" ? 201 : 200, headers: { "Content-Type": "application/json" } });
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    await user.upload(await screen.findByLabelText("Archivo de imagen: Logo"), archivo());

    const boton = await screen.findByRole("button", { name: /Subiendo…/ });
    expect(boton).toBeDisabled();
    liberar();
    expect(await screen.findByText(/Imagen subida/)).toBeInTheDocument();
  });

  it("rechaza en el navegador un archivo que no es imagen, sin llamar al servidor", async () => {
    const api = iniciar();
    const user = userEvent.setup({ applyAccept: false });
    renderConRutas(rutasContenido, "/admin/contenido");
    await user.upload(await screen.findByLabelText("Archivo de imagen: Logo"), archivo("manual.pdf", "application/pdf"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Elige una imagen JPG, PNG, WebP o GIF.");
    expect(subidas(api)).toHaveLength(0);
  });

  it("rechaza una imagen de más de 5 MB sin llamar al servidor", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    await user.upload(await screen.findByLabelText("Archivo de imagen: Logo"), archivo("enorme.png", "image/png", 5 * 1024 * 1024 + 1));
    expect(await screen.findByRole("alert")).toHaveTextContent(/máximo es de 5 MB/);
    expect(subidas(api)).toHaveLength(0);
  });

  it("muestra el mensaje del servidor si rechaza la imagen y no cambia el formulario", async () => {
    iniciar({ "POST /uploads": { status: 422, body: { message: "El archivo no es una imagen válida o es demasiado grande en píxeles" } } });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    await user.upload(await screen.findByLabelText("Archivo de imagen: Logo"), archivo());
    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo no es una imagen válida");
    expect(screen.queryByText("Hay cambios sin guardar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subir imagen/ })).toBeEnabled();
  });

  it("si no hay conexión, avisa con un mensaje claro", async () => {
    const api = iniciar();
    const original = api.getMockImplementation()!;
    api.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/uploads")) throw new TypeError("Failed to fetch");
      return original(input, init);
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    await user.upload(await screen.findByLabelText("Archivo de imagen: Logo"), archivo());
    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo conectar con el servidor/);
  });

  it("quitar la imagen limpia la URL y la llave", async () => {
    contenido = structuredClone(contenidoFixture) as ContenidoApi;
    contenido.general.logoUrl = subidaOk.url;
    contenido.general.logoKey = subidaOk.key;
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    const api = simularApi({
      "GET /contenido": () => ({ body: contenido }),
      "PUT /contenido/general": (init) => ({ body: JSON.parse(String(init?.body)) }),
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    await screen.findByRole("button", { name: /Cambiar imagen/ });
    await user.click(screen.getByRole("button", { name: /Quitar/ }));
    expect(screen.getByRole("button", { name: /Subir imagen/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText(/Cambios guardados/);
    const cuerpo = JSON.parse(String(puts(api, "/contenido/general")[0]![1]!.body));
    expect(cuerpo).toMatchObject({ logoUrl: "", logoKey: "" }); // el servidor guarda "" como "sin logo"
  });

  it("escribir una dirección web a mano borra la llave del archivo anterior", async () => {
    contenido = structuredClone(contenidoFixture) as ContenidoApi;
    contenido.general.logoUrl = subidaOk.url;
    contenido.general.logoKey = subidaOk.key;
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    const api = simularApi({
      "GET /contenido": () => ({ body: contenido }),
      "PUT /contenido/general": (init) => ({ body: JSON.parse(String(init?.body)) }),
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido");
    await user.click(await screen.findByRole("button", { name: "Usar una dirección web" }));
    const campo = screen.getByLabelText("Dirección web de la imagen (Logo)");
    expect(campo).toHaveValue(subidaOk.url);
    await user.clear(campo);
    await user.type(campo, "https://example.com/logo-externo.png");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText(/Cambios guardados/);
    const cuerpo = JSON.parse(String(puts(api, "/contenido/general")[0]![1]!.body));
    expect(cuerpo).toMatchObject({ logoUrl: "https://example.com/logo-externo.png", logoKey: "" });
  });

  it("el carrusel sube cada imagen a la carpeta «carrusel»", async () => {
    const api = iniciar({
      "POST /uploads": (init) => {
        expect((init?.body as FormData).get("carpeta")).toBe("carrusel");
        return { status: 201, body: { ...subidaOk, url: "http://localhost:4000/uploads/carrusel/2026/z.webp", key: "carrusel/2026/z.webp" } };
      },
      "PUT /contenido/inicio": (init) => ({ body: JSON.parse(String(init?.body)) }),
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido?seccion=inicio");
    const tercera = await screen.findByRole("group", { name: "Imagen 3" });
    await user.upload(within(tercera).getByLabelText("Archivo de imagen: Imagen 3"), archivo("foto.jpg", "image/jpeg"));
    await within(tercera).findByText(/Imagen subida/);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText(/Cambios guardados/);
    const enviado = JSON.parse(String(puts(api, "/contenido/inicio")[0]![1]!.body));
    expect(enviado.carrusel[2]).toMatchObject({ url: "http://localhost:4000/uploads/carrusel/2026/z.webp", key: "carrusel/2026/z.webp" });
    expect(enviado.carrusel[0].url).toBe(contenido.inicio.carrusel[0]!.url); // las demás no cambian
  });

  it("una fila nueva del carrusel pide una imagen (subir o dirección web)", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido?seccion=inicio");
    await screen.findByRole("group", { name: "Imagen 5" });
    await user.click(screen.getByRole("button", { name: "Agregar imagen" }));
    const nueva = await screen.findByRole("group", { name: "Imagen 6" });
    expect(within(nueva).getByRole("button", { name: /Subir imagen/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await within(nueva).findByText("Sube una imagen o escribe su dirección web")).toBeInTheDocument();
  });

  it("las publicaciones suben a la carpeta «publicaciones»", async () => {
    iniciar({
      "POST /uploads": (init) => {
        expect((init?.body as FormData).get("carpeta")).toBe("publicaciones");
        return { status: 201, body: subidaOk };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutasContenido, "/admin/contenido?seccion=educativo");
    await user.upload(await screen.findByLabelText("Archivo de imagen: Publicación 2"), archivo());
    expect(await screen.findByText(/Imagen subida/)).toBeInTheDocument();
  });

  it("los servicios suben a «servicios» y envían URL y llave al guardar", async () => {
    const servicios = structuredClone(serviciosFixture) as Servicio[];
    const atencion = servicios[0]!;
    useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
    const api = simularApi({
      "GET /servicios": () => ({ body: servicios }),
      "POST /uploads": (init) => {
        expect((init?.body as FormData).get("carpeta")).toBe("servicios");
        return { status: 201, body: { ...subidaOk, url: "http://localhost:4000/uploads/servicios/2026/s.webp", key: "servicios/2026/s.webp" } };
      },
      [`PUT /servicios/${atencion.id}`]: (init) => ({ body: { ...atencion, ...JSON.parse(String(init?.body)) } }),
    });
    const user = userEvent.setup();
    renderConRutas([{ path: "/admin/servicios", element: <ServiciosAdmin /> }], "/admin/servicios");
    await user.click(await screen.findByRole("button", { name: `Editar ${atencion.nombre}` }));
    const modal = await screen.findByRole("dialog");
    await user.upload(within(modal).getByLabelText("Archivo de imagen: Servicio"), archivo());
    await within(modal).findByText(/Imagen subida/);
    await user.click(within(modal).getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Servicio actualizado");
    expect(JSON.parse(String(puts(api, `/servicios/${atencion.id}`)[0]![1]!.body))).toMatchObject({
      imagenUrl: "http://localhost:4000/uploads/servicios/2026/s.webp", imagenKey: "servicios/2026/s.webp",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
