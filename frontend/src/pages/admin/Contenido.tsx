import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useContenidoParaEditar } from "@/api/contenido";
import { AvisoSinGuardar } from "@/components/admin/AvisoSinGuardar";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { cn } from "@/lib/cn";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Contenido as ContenidoApi } from "@/types/api";
import {
  SeccionContacto, SeccionCorporativo, SeccionEducativo, SeccionGeneral, SeccionInicio, SeccionMisionVision,
} from "./contenido/Secciones";

type Clave = keyof ContenidoApi;

const SECCIONES: { clave: Clave; etiqueta: string; descripcion: string; portal: string }[] = [
  { clave: "general", etiqueta: "General", descripcion: "Nombre, logo, pie de página y nota de horarios.", portal: "/" },
  { clave: "inicio", etiqueta: "Inicio", descripcion: "Título, descripción y carrusel de la portada.", portal: "/" },
  { clave: "misionVision", etiqueta: "Misión y visión", descripcion: "Textos de la página de misión y visión.", portal: "/mision-vision" },
  { clave: "contacto", etiqueta: "Contacto", descripcion: "Dirección, teléfono, correo y redes. Se muestran en el pie de página.", portal: "/" },
  { clave: "corporativo", etiqueta: "Corporativo", descripcion: "Capacitaciones y escuela para padres.", portal: "/corporativo" },
  { clave: "educativo", etiqueta: "Contenido educativo", descripcion: "Publicaciones informativas para las familias.", portal: "/contenido-educativo" },
];

export default function Contenido() {
  useDocumentTitle("Contenido del portal", "SIGCA");
  const [params] = useSearchParams();
  const actual = SECCIONES.find((s) => s.clave === params.get("seccion")) ?? SECCIONES[0]!;
  const { data, listo, isError, error, refetch } = useContenidoParaEditar();
  const [sucio, setSucio] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <AvisoSinGuardar sucio={sucio} />
      <EncabezadoPagina titulo="Contenido del portal" descripcion="Edita los textos e imágenes que ve el público. Los cambios se publican al guardar." />

      <div className="mt-8 grid gap-8 md:grid-cols-[13rem_1fr]">
        <nav aria-label="Secciones del contenido">
          <ul className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {SECCIONES.map((s) => {
              const esActual = s.clave === actual.clave;
              return (
                <li key={s.clave} className="shrink-0">
                  <Link
                    to={`?seccion=${s.clave}`}
                    replace
                    aria-current={esActual ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm transition-colors",
                      esActual ? "bg-marea-700 font-medium text-white" : "text-ink-soft hover:bg-marea-50 hover:text-ink",
                    )}
                  >
                    {s.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-labelledby="titulo-seccion" className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-seccion" className="text-2xl font-semibold text-marea-900">{actual.etiqueta}</h2>
              <p className="mt-1 text-ink-soft">{actual.descripcion}</p>
            </div>
            <a href={actual.portal} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded text-sm text-marea-700 underline underline-offset-4 hover:text-marea-900">
              Ver en el portal <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </div>

          <div className="mt-6">
            {isError && !data && <ErrorCarga error={error} onReintentar={() => refetch()} />}
            {!listo && !isError && <Cargando texto="Cargando contenido…" />}
            {listo && data && (
              // `key` reinicia el formulario al cambiar de seccion
              <div key={actual.clave}>
                {actual.clave === "general" && <SeccionGeneral datos={data.general} alCambiarSucio={setSucio} />}
                {actual.clave === "inicio" && <SeccionInicio datos={data.inicio} alCambiarSucio={setSucio} />}
                {actual.clave === "misionVision" && <SeccionMisionVision datos={data.misionVision} alCambiarSucio={setSucio} />}
                {actual.clave === "contacto" && <SeccionContacto datos={data.contacto} alCambiarSucio={setSucio} />}
                {actual.clave === "corporativo" && <SeccionCorporativo datos={data.corporativo} alCambiarSucio={setSucio} />}
                {actual.clave === "educativo" && <SeccionEducativo datos={data.educativo} alCambiarSucio={setSucio} />}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
