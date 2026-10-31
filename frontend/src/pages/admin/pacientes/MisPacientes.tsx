import { History, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { usePacientesBasicos } from "@/api/pacientes";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Paginacion } from "@/components/ui/Paginacion";
import { textoEdad } from "@/lib/fechas";
import { useDebounce } from "@/lib/useDebounce";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SEXO = { MASCULINO: "Masculino", FEMENINO: "Femenino", OTRO: "Otro" } as const;

/** Vista del profesional: solo informacion basica de los pacientes que atiende o atendio. */
export default function MisPacientes() {
  useDocumentTitle("Mis pacientes", "SIGCA");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const cambiar = (c: Record<string, string | undefined>) =>
    setParams((a) => { const s = new URLSearchParams(a); for (const [k, v] of Object.entries(c)) (v ? s.set(k, v) : s.delete(k)); return s; }, { replace: true });

  const [texto, setTexto] = useState(q);
  const retrasado = useDebounce(texto, 300);
  useEffect(() => {
    if (retrasado.trim() !== q) cambiar({ q: retrasado.trim() || undefined, page: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrasado]);

  const { data, isPending, isError, error, refetch, isFetching } = usePacientesBasicos({ q: q || undefined, page, limit: 15 });

  return (
    <div className="mx-auto max-w-5xl">
      <EncabezadoPagina titulo="Mis pacientes" descripcion="Los pacientes que atiendes. Por privacidad solo ves su información básica." />
      <div className="relative mt-8 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o apellido" aria-label="Buscar paciente" className={claseControl(false, "pl-10")} />
      </div>

      {isPending && <Cargando texto="Cargando pacientes…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}
      {data && data.items.length === 0 && <Vacio titulo={q ? "Ningún paciente coincide con la búsqueda" : "Todavía no tienes pacientes asignados"}>{!q && "Aparecerán aquí cuando tengas citas con ellos."}</Vacio>}

      {data && data.items.length > 0 && (
        <>
          <div className={`mt-4 overflow-x-auto rounded-xl border border-marea-100 bg-white transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Pacientes que atiendes</caption>
              <thead className="border-b border-marea-100 bg-marea-50 text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Paciente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Sexo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Historial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marea-100">
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <div className="flex items-center gap-3">
                        <Avatar nombres={p.nombres} apellidos={p.apellidos} url={p.fotoUrl} />
                        <div>
                          <p className="font-medium text-ink">{p.nombres} {p.apellidos}</p>
                          <p className="text-ink-soft">{textoEdad(p.edad)}{p.esMenor && " · menor de edad"}</p>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3">{SEXO[p.sexo]}</td>
                    <td className="px-4 py-3"><Badge tono={p.estado === "ACTIVO" ? "ok" : "neutro"}>{p.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/citas?paciente=${p.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-marea-700 hover:bg-marea-50" aria-label={`Historial de citas de ${p.nombres} ${p.apellidos}`}>
                        <History className="size-4" aria-hidden="true" />
                        Ver citas
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion page={data.page} pages={data.pages} total={data.total} etiqueta="pacientes" onCambiar={(n) => cambiar({ page: n > 1 ? String(n) : undefined })} />
        </>
      )}
    </div>
  );
}
