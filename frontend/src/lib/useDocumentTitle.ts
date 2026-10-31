import { useEffect } from "react";

export function useDocumentTitle(titulo: string | undefined, sufijo?: string) {
  useEffect(() => {
    if (!titulo) return;
    document.title = sufijo ? `${titulo} | ${sufijo}` : titulo;
  }, [titulo, sufijo]);
}
