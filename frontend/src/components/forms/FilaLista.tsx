import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  titulo: string;
  onSubir?: () => void;
  onBajar?: () => void;
  onQuitar: () => void;
  children: ReactNode;
}

/** Tarjeta de un elemento de una lista editable, con botones para reordenar y quitar. */
export function FilaLista({ titulo, onSubir, onBajar, onQuitar, children }: Props) {
  return (
    <fieldset className="rounded-xl border border-marea-100 bg-white p-4">
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-marea-900" aria-hidden="true">{titulo}</p>
        <div className="flex gap-1">
          {onSubir && (
            <Button variante="texto" aria-label={`Subir: ${titulo}`} title="Subir" onClick={onSubir} disabled={!onSubir}>
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
          )}
          {onBajar && (
            <Button variante="texto" aria-label={`Bajar: ${titulo}`} title="Bajar" onClick={onBajar}>
              <ArrowDown className="size-4" aria-hidden="true" />
            </Button>
          )}
          <Button variante="texto" aria-label={`Quitar: ${titulo}`} title="Quitar" onClick={onQuitar} className="text-danger hover:bg-danger-soft">
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
