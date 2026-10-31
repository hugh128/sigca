/** Fechas de calendario (AAAA-MM-DD), con la misma logica que el backend. */

/** Hoy como AAAA-MM-DD, en la zona horaria de Guatemala. */
export function hoyGuatemala(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export function esFechaValida(fecha: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return false;
  const [y, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(y, mes - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d;
}

/** Edad en anios cumplidos. Debe dar el mismo resultado que el servidor. */
export function calcularEdad(fechaNacimiento: string, hoy: string = hoyGuatemala()): number {
  const anios = Number(hoy.slice(0, 4)) - Number(fechaNacimiento.slice(0, 4));
  return hoy.slice(5) < fechaNacimiento.slice(5) ? anios - 1 : anios;
}

export const MAYORIA_DE_EDAD = 18;

/** "8 años" / "1 año" / "7 meses" (para menores de un anio). */
export function textoEdad(edad: number): string {
  return edad === 1 ? "1 año" : `${edad} años`;
}
