/**
 * Fechas "de calendario" (sin hora) como texto AAAA-MM-DD. Se usan para fecha de nacimiento y de inicio:
 * no tienen zona horaria, asi que no hay riesgo de que "se corran" un dia al guardarlas o mostrarlas.
 * El "hoy" del sistema es siempre el de Guatemala (UTC-6, sin horario de verano), no el del servidor.
 */
export const ZONA_HORARIA = "America/Guatemala";

/** Fecha de hoy en Guatemala, como AAAA-MM-DD. */
export function hoyGuatemala(ahora: Date = new Date()): string {
  // "en-CA" formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export function esFechaValida(fecha: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return false;
  const [y, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(y, mes - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d;
}

/** Edad en anios cumplidos a la fecha `hoy`. Compara (mes, dia) como texto: "03-15" < "04-02". */
export function calcularEdad(fechaNacimiento: string, hoy: string = hoyGuatemala()): number {
  const anios = Number(hoy.slice(0, 4)) - Number(fechaNacimiento.slice(0, 4));
  return hoy.slice(5) < fechaNacimiento.slice(5) ? anios - 1 : anios;
}

export const MAYORIA_DE_EDAD = 18;

/**
 * Fecha limite para ser mayor de edad hoy: quien nacio en esa fecha o antes ya cumplio 18.
 * Sirve para filtrar menores en la base de datos (nacidos DESPUES de esta fecha) y es coherente con calcularEdad.
 */
export function fechaLimiteMayoriaEdad(hoy: string = hoyGuatemala()): string {
  return `${Number(hoy.slice(0, 4)) - MAYORIA_DE_EDAD}${hoy.slice(4)}`;
}
