import { ImageIcon } from "lucide-react";
import { useState } from "react";

/** Miniatura de una imagen por su direccion; si no carga, muestra un marcador. */
export function VistaPrevia({ url }: { url?: string }) {
  const [fallo, setFallo] = useState(false);
  const valida = Boolean(url && /^https?:\/\/\S+$/.test(url)) && !fallo;
  return valida ? (
    <img src={url} alt="" onError={() => setFallo(true)} className="size-20 shrink-0 rounded-lg bg-marea-100 object-cover" />
  ) : (
    <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-marea-50 text-marea-500" title={url ? "No se pudo cargar la imagen" : "Sin imagen"}>
      <ImageIcon className="size-7" aria-hidden="true" />
    </div>
  );
}
