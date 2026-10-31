import type { ReactNode } from "react";

export function EncabezadoPagina({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-marea-900">{titulo}</h1>
        {descripcion && <p className="mt-1 text-ink-soft">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
