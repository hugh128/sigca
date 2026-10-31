import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Imagen } from "@/types/api";

const INTERVALO_MS = 6000;

function prefiereMenosMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Carrusel accesible: avanza solo cada 6 s, se detiene al pasar el mouse o enfocar un control,
 * y no se mueve solo si la persona pidio menos movimiento en su sistema.
 */
export function Carrusel({ imagenes, className }: { imagenes: Imagen[]; className?: string }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = imagenes.length;

  useEffect(() => {
    if (pausado || total < 2 || prefiereMenosMovimiento()) return;
    const t = setInterval(() => setActual((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearInterval(t);
  }, [pausado, total]);

  if (total === 0) return null;

  const ir = (i: number) => setActual(((i % total) + total) % total);

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label="Imágenes del centro"
      className={cn("relative overflow-hidden rounded-tl-[5rem] rounded-br-[5rem] rounded-tr-2xl rounded-bl-2xl bg-marea-100", className)}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="relative aspect-[4/3] sm:aspect-[5/4]">
        {imagenes.map((img, i) => (
          <img
            key={img.id}
            src={img.url}
            alt={img.alt}
            loading={i === 0 ? "eager" : "lazy"}
            aria-hidden={i !== actual}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700 motion-reduce:transition-none",
              i === actual ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>

      {total > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-marea-900/70 to-transparent px-5 pb-4 pt-10">
            <div className="flex gap-1.5" role="group" aria-label="Elegir imagen">
              {imagenes.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={`Ir a la imagen ${i + 1} de ${total}`}
                  aria-current={i === actual}
                  className="grid size-6 place-items-center rounded-full"
                >
                  <span className={cn("block h-2 rounded-full bg-white transition-all", i === actual ? "w-6" : "w-2 opacity-60")} />
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => ir(actual - 1)} aria-label="Imagen anterior" className="grid size-9 place-items-center rounded-full bg-white/90 text-marea-900 hover:bg-white">
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => ir(actual + 1)} aria-label="Imagen siguiente" className="grid size-9 place-items-center rounded-full bg-white/90 text-marea-900 hover:bg-white">
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
