/** Los montos viajan en centavos enteros (RN-28); aqui se convierten a quetzales solo para mostrar. */
export function formatearQuetzales(centavos: number): string {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(centavos / 100);
}

export function formatearDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "2026-09-15" -> "15 de septiembre de 2026" (sin desfases de zona horaria). */
export function formatearFecha(fechaIso: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  if (!y || !m || !d) return fechaIso;
  return new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
}

/** "14:00" -> "2:00 p. m." */
export function formatearHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return new Intl.DateTimeFormat("es-GT", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, h, m));
}
