import { useContenido } from "@/api/contenido";
import { useServiciosPublicos } from "@/api/servicios";
import { FilaServicio } from "@/components/public/FilaServicio";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function Servicios() {
  const contenido = useContenido();
  const { data, isPending, isError, error, refetch } = useServiciosPublicos();
  useDocumentTitle("Servicios", contenido.data?.general.nombreCentro);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-marea-900">Servicios</h1>
      <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
        Cada servicio se programa con cita previa. Contáctanos para conocer cuál se adapta mejor a tu situación.
      </p>

      {isPending && <Cargando />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}
      {data && data.length === 0 && <Vacio titulo="Por ahora no hay servicios publicados">Vuelve pronto o contáctanos para más información.</Vacio>}
      {data && data.length > 0 && (
        <ul className="mt-8 divide-y divide-marea-100 border-y border-marea-100">
          {data.map((s) => (
            <FilaServicio key={s.id} servicio={s} grande />
          ))}
        </ul>
      )}
    </div>
  );
}
