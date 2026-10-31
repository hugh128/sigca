import { useContenido } from "@/api/contenido";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { BloqueCorporativo } from "@/types/api";

function Bloque({ titulo, bloque, color }: { titulo: string; bloque: BloqueCorporativo; color: string }) {
  const vacio = !bloque.descripcion && bloque.actividades.length === 0 && bloque.imagenes.length === 0;
  if (vacio) return null;
  return (
    <section aria-labelledby={`bloque-${color}`}>
      <h2 id={`bloque-${color}`} className={`border-t-4 pt-4 text-2xl font-semibold text-marea-900 ${color === "sol" ? "border-sol-400" : "border-marea-500"}`}>
        {titulo}
      </h2>
      {bloque.descripcion && <p className="mt-4 max-w-2xl whitespace-pre-line font-serif text-lg leading-relaxed">{bloque.descripcion}</p>}

      {bloque.actividades.length > 0 && (
        <ul className="mt-6 divide-y divide-marea-100 border-y border-marea-100">
          {bloque.actividades.map((a) => (
            <li key={a.id} className="py-4">
              <h3 className="font-medium text-marea-900">{a.titulo}</h3>
              <p className="mt-1 max-w-2xl whitespace-pre-line font-serif leading-relaxed text-ink-soft">{a.descripcion}</p>
            </li>
          ))}
        </ul>
      )}

      {bloque.imagenes.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {bloque.imagenes.map((i) => (
            <li key={i.id}>
              <img src={i.url} alt={i.alt} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Corporativo() {
  const { data, isPending, isError, error, refetch } = useContenido();
  useDocumentTitle("Corporativo", data?.general.nombreCentro);

  if (isPending) return <Cargando />;
  if (isError) return <ErrorCarga error={error} onReintentar={() => refetch()} />;

  const { capacitaciones, escuelaPadres } = data.corporativo;
  const sinContenido = [capacitaciones, escuelaPadres].every((b) => !b.descripcion && b.actividades.length === 0 && b.imagenes.length === 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-marea-900">Corporativo</h1>
      {sinContenido ? (
        <Vacio titulo="Pronto compartiremos nuestras capacitaciones y la escuela para padres" />
      ) : (
        <div className="mt-10 grid gap-14 lg:grid-cols-2">
          <Bloque titulo="Capacitaciones" bloque={capacitaciones} color="sol" />
          <Bloque titulo="Escuela para padres" bloque={escuelaPadres} color="marea" />
        </div>
      )}
    </div>
  );
}
