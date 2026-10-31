import { ApiError } from "./api";

/** "carrusel.0.url" (API) -> "carrusel[0].url" (nombre de campo en TanStack Form). */
export function campoDeFormulario(campo: string): string {
  return campo.replace(/\.(\d+)(?=\.|$)/g, "[$1]");
}

/**
 * Convierte un error de la API al formato que TanStack Form entiende en un validador de envio:
 * errores por campo (los que vienen en `errores`) y/o un error general del formulario.
 * `campoUnico` es el campo al que se asigna un 409 (valor duplicado), p. ej. "email".
 */
export function erroresDeServidor(error: unknown, campoUnico?: string): { form?: string; fields: Record<string, string> } {
  if (!(error instanceof ApiError)) {
    return { form: "No pudimos guardar los cambios. Inténtalo de nuevo.", fields: {} };
  }
  const fields: Record<string, string> = {};
  for (const e of error.errores ?? []) {
    const campo = campoDeFormulario(e.campo);
    if (e.campo && !fields[campo]) fields[campo] = e.mensaje;
  }
  if (error.status === 409 && campoUnico && !fields[campoUnico]) fields[campoUnico] = error.message;
  return { form: Object.keys(fields).length > 0 ? undefined : error.message, fields };
}
