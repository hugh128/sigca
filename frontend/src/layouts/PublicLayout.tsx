import { Outlet, ScrollRestoration } from "react-router";
import { useContenido } from "@/api/contenido";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import type { Contenido } from "@/types/api";

/** Si el contenido aun no carga (o falla), el portal sigue mostrando una estructura minima. */
const RESPALDO: Pick<Contenido, "general" | "contacto"> = {
  general: { nombreCentro: "SIGCA", eslogan: "", textoPiePagina: "", notaHorarios: "" },
  contacto: { direccion: "", telefono: "", correo: "", whatsapp: "" },
};

export function PublicLayout() {
  const { data } = useContenido();
  const contenido = data ?? RESPALDO;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Saltar al contenido
      </a>
      <PublicHeader nombre={contenido.general.nombreCentro} logoUrl={contenido.general.logoUrl} />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      {data && <PublicFooter contenido={data} />}
      <ScrollRestoration />
    </div>
  );
}
