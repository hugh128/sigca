/**
 * Quita las claves con valor `undefined` (a cualquier profundidad).
 * Necesario antes de guardar objetos en campos `Mixed`: MongoDB guardaria `undefined` como `null`.
 */
export function sinUndefined<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}
