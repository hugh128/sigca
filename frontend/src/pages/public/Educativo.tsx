import { ExternalLink } from "lucide-react";
import { useContenido } from "@/api/contenido";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { formatearFecha } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function Educativo() {
  const { data, isPending, isError, error, refetch } = useContenido();
  useDocumentTitle("Contenido educativo", data?.general.nombreCentro);

  if (isPending) return <Cargando />;
  if (isError) return <ErrorCarga error={error} onReintentar={() => refetch()} />;

  const publicaciones = data.educativo.publicaciones;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-marea-900">Contenido educativo</h1>
      <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
        Información para acompañar mejor el desarrollo emocional y la comunicación de niñas, niños y adolescentes.
      </p>

      {publicaciones.length === 0 ? (
        <Vacio titulo="Pronto compartiremos nuevas publicaciones" />
      ) : (
        <div className="mt-10 divide-y divide-marea-100 border-y border-marea-100">
          {publicaciones.map((p) => (
            <article key={p.id} className="grid gap-6 py-8 md:grid-cols-[16rem_1fr] md:gap-10">
              {p.imagenUrl ? (
                <img src={p.imagenUrl} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
              ) : (
                <div className="hidden md:block" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm text-ink-soft">
                  <time dateTime={p.fechaPublicacion}>{formatearFecha(p.fechaPublicacion)}</time>
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-marea-900">{p.titulo}</h2>
                <p className="mt-3 max-w-2xl whitespace-pre-line font-serif text-lg leading-relaxed">{p.descripcion}</p>
                {p.enlaceUrl && (
                  <a href={p.enlaceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded font-medium text-marea-700 underline underline-offset-4 hover:text-marea-900">
                    Leer más sobre «{p.titulo}» <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
