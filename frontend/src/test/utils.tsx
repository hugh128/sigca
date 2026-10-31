import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import { vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/store/auth";
import { useToastStore } from "@/store/toast";

export function renderConRutas(rutas: RouteObject[], entrada = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] });
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...resultado, router };
}

type Respuesta = { status?: number; body?: unknown };
type Manejador = Respuesta | ((init: RequestInit | undefined, url: URL) => Respuesta | Promise<Respuesta>);

/** Simula fetch segun la ruta de la API (ej. "GET /contenido"). Una ruta no declarada falla la prueba. */
export function simularApi(rutas: Record<string, Manejador>) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const ruta = `${init?.method ?? "GET"} ${url.pathname.replace(/^\/api/, "")}`;
    const m = rutas[ruta];
    if (!m) throw new Error(`Peticion no simulada: ${ruta}`);
    const { status = 200, body = null } = typeof m === "function" ? await m(init, url) : m;
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function reiniciarEstado() {
  localStorage.clear();
  useAuthStore.setState({ token: null, usuario: null, estado: "anonimo", sesionExpirada: false });
  useToastStore.setState({ toasts: [] });
  vi.unstubAllGlobals();
}
