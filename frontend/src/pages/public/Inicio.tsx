import { useContenido } from "@/api/contenido";
import { useHorarios } from "@/api/horarios";
import { useServiciosPublicos } from "@/api/servicios";
import { ArcosDecorativos } from "@/components/public/Marca";
import { Carrusel } from "@/components/public/Carrusel";
import { FilaServicio } from "@/components/public/FilaServicio";
import { ListaHorarios } from "@/components/public/ListaHorarios";
import { LinkBoton } from "@/components/ui/Button";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function Inicio() {
  const contenido = useContenido();
  const servicios = useServiciosPublicos();
  const horarios = useHorarios();

  useDocumentTitle(contenido.data?.general.nombreCentro);

  if (contenido.isPending) return <Cargando />;
  if (contenido.isError) return <ErrorCarga error={contenido.error} onReintentar={() => contenido.refetch()} />;

  const { inicio, misionVision, general } = contenido.data;

  return (
    <>
      {/* Portada */}
      <section className="overflow-x-clip">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-marea-900 sm:text-5xl">{inicio.titulo}</h1>
            {inicio.subtitulo && <p className="mt-5 max-w-xl font-serif text-xl leading-relaxed text-ink-soft">{inicio.subtitulo}</p>}
            {inicio.descripcion && <p className="mt-4 max-w-xl font-serif leading-relaxed">{inicio.descripcion}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBoton to="/servicios" variante="acento" tamano="lg">Conocer los servicios</LinkBoton>
              <LinkBoton to="/horarios" variante="contorno" tamano="lg">Ver horarios de atención</LinkBoton>
            </div>
          </div>
          <div className="relative">
            <ArcosDecorativos className="pointer-events-none absolute -bottom-24 -right-24 size-[28rem] max-w-none" />
            <Carrusel imagenes={inicio.carrusel} className="relative shadow-xl" />
          </div>
        </div>
      </section>

      {/* Mision */}
      <section className="bg-bruma">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-[1fr_2fr] md:gap-12">
          <h2 className="text-2xl font-semibold text-marea-900">Nuestra misión</h2>
          <div>
            <p className="max-w-2xl font-serif text-xl leading-relaxed">{misionVision.mision}</p>
            <LinkBoton to="/mision-vision" variante="texto" className="mt-4 -ml-4">Conocer también nuestra visión</LinkBoton>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-marea-900">Servicios</h2>
          <LinkBoton to="/servicios" variante="texto">Ver todos los servicios</LinkBoton>
        </div>
        {servicios.isPending && <Cargando />}
        {servicios.isError && <ErrorCarga error={servicios.error} onReintentar={() => servicios.refetch()} />}
        {servicios.data && (
          <ul className="mt-4 divide-y divide-marea-100 border-y border-marea-100">
            {servicios.data.slice(0, 4).map((s) => (
              <FilaServicio key={s.id} servicio={s} />
            ))}
          </ul>
        )}
      </section>

      {/* Horarios */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-semibold text-marea-900">Horarios de atención</h2>
        <div className="mt-4 max-w-3xl">
          {horarios.isPending && <Cargando />}
          {horarios.isError && <ErrorCarga error={horarios.error} onReintentar={() => horarios.refetch()} />}
          {horarios.data && <ListaHorarios dias={horarios.data.dias} />}
          {general.notaHorarios && <p className="mt-2 font-serif text-ink-soft">{general.notaHorarios}</p>}
        </div>
      </section>
    </>
  );
}
