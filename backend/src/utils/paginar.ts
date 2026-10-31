export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function armarPagina<T>(items: T[], total: number, page: number, limit: number): Pagina<T> {
  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
