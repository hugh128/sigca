/** Minusculas y sin tildes, para buscar "maria" y encontrar "María". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
