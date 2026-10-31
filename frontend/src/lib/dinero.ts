/**
 * Conversion entre lo que la persona escribe (quetzales: "250" o "250.50") y lo que viaja a la API
 * (centavos enteros, RN-28). Se trabaja con el texto, sin multiplicar decimales, para evitar errores
 * de punto flotante (p. ej. 19.99 * 100 = 1998.9999999999998).
 */
const PATRON_QUETZALES = /^\d{1,7}(\.\d{1,2})?$/;
/** Con separador de miles bien formado: "1,250" o "1,250.50" (nunca "12,5.5"). */
const PATRON_CON_MILES = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/;

/** "250.5" -> 25050. Devuelve null si el texto no es un monto valido. */
export function quetzalesACentavos(texto: string): number | null {
  let limpio = texto.trim().replace(/^Q\s*/i, "");
  if (PATRON_CON_MILES.test(limpio)) limpio = limpio.replace(/,/g, "");
  if (!PATRON_QUETZALES.test(limpio)) return null;
  const [enteros, decimales = ""] = limpio.split(".");
  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

/** 25050 -> "250.50" (para rellenar el campo al editar). */
export function centavosAQuetzales(centavos: number): string {
  const q = Math.floor(centavos / 100);
  const c = String(centavos % 100).padStart(2, "0");
  return `${q}.${c}`;
}
