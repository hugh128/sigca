import { useContenido } from "@/api/contenido";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function MisionVision() {
  const { data, isPending, isError, error, refetch } = useContenido();
  useDocumentTitle("Misión y visión", data?.general.nombreCentro);

  if (isPending) return <Cargando />;
  if (isError) return <ErrorCarga error={error} onReintentar={() => refetch()} />;

  const { mision, vision } = data.misionVision;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-marea-900">Misión y visión</h1>
      <div className="mt-12 grid gap-14 md:grid-cols-2">
        <section>
          <h2 className="border-t-4 border-sol-400 pt-4 text-2xl font-semibold text-marea-900">Misión</h2>
          <p className="mt-4 max-w-xl whitespace-pre-line font-serif text-lg leading-relaxed">{mision}</p>
        </section>
        <section>
          <h2 className="border-t-4 border-marea-500 pt-4 text-2xl font-semibold text-marea-900">Visión</h2>
          <p className="mt-4 max-w-xl whitespace-pre-line font-serif text-lg leading-relaxed">{vision}</p>
        </section>
      </div>
    </div>
  );
}
