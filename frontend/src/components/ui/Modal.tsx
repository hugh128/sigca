import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  ancho?: "sm" | "md" | "lg";
  children: ReactNode;
}

const ANCHOS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Ventana modal basada en el elemento nativo <dialog>: el navegador se encarga de atrapar el foco,
 * cerrar con Escape y dejar el resto de la pagina inaccesible. El contenido solo se monta al abrir,
 * asi cada apertura empieza con el formulario limpio.
 */
export function Modal({ abierto, onCerrar, titulo, descripcion, ancho = "md", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();
  // Ultimo valor de `abierto`: permite distinguir «la persona cerro la ventana» (Escape) de «la cerre yo por codigo».
  const abiertoRef = useRef(abierto);
  abiertoRef.current = abierto;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    else if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onClose={() => {
        // El evento `close` tambien se dispara cuando se cierra por codigo (al abrir otra ventana, por ejemplo).
        // Solo es un cierre de la persona si esta ventana sigue figurando como abierta.
        if (abiertoRef.current) onCerrar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar(); // clic en el fondo oscuro
      }}
      className={cn("m-auto max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50", ANCHOS[ancho])}
    >
      {abierto && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={idTitulo} className="text-xl font-semibold text-marea-900">{titulo}</h2>
              {descripcion && <p id={idDescripcion} className="mt-1 text-sm text-ink-soft">{descripcion}</p>}
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="-mr-2 -mt-1 rounded-lg p-2 text-ink-soft hover:bg-marea-50 hover:text-ink">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
