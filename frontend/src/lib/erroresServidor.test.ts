import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { campoDeFormulario, erroresDeServidor } from "./erroresServidor";

describe("erroresDeServidor", () => {
  it("convierte rutas de la API a nombres de campo de TanStack Form", () => {
    expect(campoDeFormulario("carrusel.0.url")).toBe("carrusel[0].url");
    expect(campoDeFormulario("capacitaciones.actividades.2.titulo")).toBe("capacitaciones.actividades[2].titulo");
    expect(campoDeFormulario("email")).toBe("email");
  });

  it("reparte errores por campo y deja el mensaje general solo si no hay campos", () => {
    const conCampos = new ApiError(400, "Datos inválidos", [{ campo: "carrusel.1.url", mensaje: "Mala URL" }]);
    expect(erroresDeServidor(conCampos)).toEqual({ form: undefined, fields: { "carrusel[1].url": "Mala URL" } });
    const sinCampos = new ApiError(500, "Error interno del servidor");
    expect(erroresDeServidor(sinCampos)).toEqual({ form: "Error interno del servidor", fields: {} });
  });

  it("un 409 se asigna al campo único indicado", () => {
    const e = new ApiError(409, "Ya existe un usuario con ese correo electrónico");
    expect(erroresDeServidor(e, "email").fields).toEqual({ email: "Ya existe un usuario con ese correo electrónico" });
  });

  it("un error que no es de la API da un mensaje genérico", () => {
    expect(erroresDeServidor(new TypeError("x")).form).toMatch(/Inténtalo de nuevo/);
  });
});
