import { useAuthStore } from "@/store/auth";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4100/api").replace(/\/$/, "");

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** Error devuelto por la API (o por la falta de conexion, con status 0). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Errores por campo (solo si el servidor mando una lista). */
    public readonly errores?: ErrorCampo[],
    /** Otros datos del error (p. ej. el horario con el que choca una cita). */
    public readonly detalles?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Opciones {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Por defecto se envia el token si hay sesion. Con `false` la peticion va como visitante (portal publico). */
  auth?: boolean;
}

export async function api<T>(path: string, { method = "GET", body, signal, auth = true }: Opciones = {}): Promise<T> {
  const token = auth ? useAuthStore.getState().token : null;
  // Con FormData (subida de archivos) el navegador pone solo el Content-Type, con su "boundary".
  const esFormData = typeof FormData !== "undefined" && body instanceof FormData;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !esFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : esFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }

  let datos: unknown = null;
  try {
    datos = await respuesta.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!respuesta.ok) {
    // Token vencido o usuario desactivado: se cierra la sesion y los guards redirigen al login.
    if (respuesta.status === 401 && token) useAuthStore.getState().expirarSesion();
    const d = datos as { message?: string; errors?: unknown; detalles?: unknown } | null;
    // `errors` solo se acepta si es una lista: asi un detalle con otra forma nunca rompe a quien lo recorre
    const errores = Array.isArray(d?.errors) ? (d.errors as ErrorCampo[]) : undefined;
    throw new ApiError(respuesta.status, d?.message ?? "Ocurrió un error inesperado", errores, d?.detalles);
  }

  return datos as T;
}
