/** Identificador para filas nuevas de una lista (clave de React y de la API). */
export function nuevoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
