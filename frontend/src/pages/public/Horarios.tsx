import { useContenido } from "@/api/contenido";
import { useHorarios } from "@/api/horarios";
import { textoFranjas } from "@/components/public/ListaHorarios";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { nombreDia } from "@/lib/horarios";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function Horarios() {
  const contenido = useContenido();
  const { data, isPending, isError, error, refetch } = useHorarios();
  useDocumentTitle("Horarios de atención", contenido.data?.general.nombreCentro);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-marea-900">Horarios de atención</h1>
      {contenido.data?.general.notaHorarios && (
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">{contenido.data.general.notaHorarios}</p>
      )}

      {isPending && <Cargando />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}
      {data && (
        <table className="mt-8 w-full max-w-3xl text-left">
          <caption className="sr-only">Horario de atención por día de la semana</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Horario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-marea-100 border-y border-marea-100">
            {data.dias.map((d) => (
              <tr key={d.dia}>
                <th scope="row" className="w-40 py-4 pr-4 align-top font-medium capitalize text-marea-900">
                  {nombreDia(d.dia)}
                </th>
                <td className={d.atiende ? "py-4 text-ink" : "py-4 text-ink-soft"}>
                  {d.atiende ? (
                    <ul className="space-y-1">
                      {d.franjas.map((f) => (
                        <li key={f.inicio}>{textoFranjas([f])}</li>
                      ))}
                    </ul>
                  ) : (
                    "Sin atención"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
