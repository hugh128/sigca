import { useState } from "react";
import { cn } from "@/lib/cn";

const TAMANOS = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-20 text-xl" };

/** Foto de una persona o, si no hay (o no carga), sus iniciales. */
export function Avatar({ nombres, apellidos, url, tamano = "md", className }: {
  nombres: string; apellidos: string; url?: string; tamano?: keyof typeof TAMANOS; className?: string;
}) {
  const [fallo, setFallo] = useState(false);
  const iniciales = `${nombres.trim()[0] ?? ""}${apellidos.trim()[0] ?? ""}`.toUpperCase();
  return url && !fallo ? (
    <img src={url} alt="" loading="lazy" onError={() => setFallo(true)} className={cn("shrink-0 rounded-full bg-marea-100 object-cover", TAMANOS[tamano], className)} />
  ) : (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-marea-100 font-semibold text-marea-800", TAMANOS[tamano], className)}>
      {iniciales}
    </span>
  );
}
