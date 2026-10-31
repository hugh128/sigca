import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/auth";
import { reiniciarEstado } from "@/test/utils";
import { api, ApiError } from "./api";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(reiniciarEstado);
afterEach(reiniciarEstado);

describe("cliente api", () => {
  it("envia el token de la sesion", async () => {
    useAuthStore.setState({ token: "abc123" });
    const f = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json({ ok: true }));
    vi.stubGlobal("fetch", f);
    await api("/usuarios");
    const init = f.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc123");
  });

  it("no envia el token con auth:false (portal publico)", async () => {
    useAuthStore.setState({ token: "abc123" });
    const f = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json([]));
    vi.stubGlobal("fetch", f);
    await api("/servicios", { auth: false });
    const init = f.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("envia archivos como FormData, sin forzar Content-Type (el navegador agrega el boundary)", async () => {
    const f = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json({ url: "x" }, 201));
    vi.stubGlobal("fetch", f);
    const datos = new FormData();
    datos.append("archivo", new File(["abc"], "a.png", { type: "image/png" }));
    await api("/uploads", { method: "POST", body: datos });
    const init = f.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBe(datos);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("convierte los errores de la API en ApiError con detalle por campo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Datos inválidos", errors: [{ campo: "email", mensaje: "Correo inválido" }] }, 400)));
    const error = (await api("/auth/login", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("Datos inválidos");
    expect(error.errores).toEqual([{ campo: "email", mensaje: "Correo inválido" }]);
  });

  it("un 409 con `detalles` (objeto) no rompe: errores queda vacío y los detalles se conservan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "El profesional ya tiene una cita de 14:00 a 14:50 ese día", detalles: { conflicto: { horaInicio: "14:00", horaFin: "14:50" } } }, 409)));
    const error = (await api("/citas", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(409);
    expect(error.errores).toBeUndefined();
    expect(error.detalles).toEqual({ conflicto: { horaInicio: "14:00", horaFin: "14:50" } });
  });

  it("si `errors` llegara con una forma que no es lista, se ignora en vez de romper", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Conflicto", errors: { conflicto: {} } }, 409)));
    const error = (await api("/citas", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.errores).toBeUndefined();
  });

  it("cierra la sesion cuando el servidor responde 401 a una peticion autenticada", async () => {
    useAuthStore.setState({ token: "vencido", estado: "autenticado" });
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Sesión inválida o expirada" }, 401)));
    await expect(api("/usuarios")).rejects.toBeInstanceOf(ApiError);
    const s = useAuthStore.getState();
    expect(s.estado).toBe("anonimo");
    expect(s.token).toBeNull();
    expect(s.sesionExpirada).toBe(true);
  });

  it("un 401 del login (sin sesion previa) no marca la sesion como expirada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Credenciales inválidas" }, 401)));
    await expect(api("/auth/login", { method: "POST", body: {}, auth: false })).rejects.toThrow("Credenciales inválidas");
    expect(useAuthStore.getState().sesionExpirada).toBe(false);
  });

  it("informa claramente cuando no hay conexion", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const error = (await api("/contenido").catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/conectar con el servidor/);
  });
});
