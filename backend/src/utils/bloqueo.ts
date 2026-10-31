const colas = new Map<string, Promise<unknown>>();

/**
 * Ejecuta `tarea` de a una por vez para la misma `clave` (p. ej. un profesional).
 * Evita que dos peticiones simultaneas pasen ambas la validacion de "horario libre" y creen citas traslapadas
 * (la carrera entre "revisar" y "guardar"). Protege dentro de UNA instancia del servidor; si algun dia se
 * ejecutaran varias instancias haria falta una transaccion o un bloqueo en la base de datos.
 */
export async function conBloqueo<T>(clave: string, tarea: () => Promise<T>): Promise<T> {
  const previa = colas.get(clave) ?? Promise.resolve();
  const actual = previa.catch(() => undefined).then(tarea);
  colas.set(clave, actual);
  try {
    return await actual;
  } finally {
    if (colas.get(clave) === actual) colas.delete(clave);
  }
}
