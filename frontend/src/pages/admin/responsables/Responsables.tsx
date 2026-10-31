import { Pencil, Plus, Search, UsersRound, UserMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAsociarPaciente, useDesasociarPaciente, useResponsables } from "@/api/responsables";
import { usePacientes } from "@/api/pacientes";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { BuscadorAsociar } from "@/components/forms/BuscadorAsociar";
import { claseControl } from "@/components/forms/TextField";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/useDebounce";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { toast } from "@/store/toast";
import type { Responsable } from "@/types/api";
import { FormularioResponsable } from "./FormularioResponsable";

const POR_PAGINA = 15;

/** Ventana para ver, quitar y agregar los pacientes de un responsable. */
function GestionPacientes({ responsableId }: { responsableId: string }) {
  // Se lee de la lista cacheada para que se actualice sola al asociar o quitar.
  const [busqueda, setBusqueda] = useState("");
  const alBuscar = useCallback((q: string) => setBusqueda(q), []);
  const lista = useResponsables({ limit: 100 });
  const r = lista.data?.items.find((x) => x.id === responsableId);
  const buscando = usePacientes({ q: busqueda || undefined, limit: 6 });
  const asociar = useAsociarPaciente();
  const desasociar = useDesasociarPaciente();
  if (!r) return <Cargando />;
  const asociados = new Set(r.pacientes.map((p) => p.id));

  const accion = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.exito(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos completar la acción");
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="actuales">
        <h3 id="actuales" className="text-sm font-semibold text-marea-900">Pacientes asociados</h3>
        {r.pacientes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Todavía no tiene pacientes asociados.</p>
        ) : (
          <ul className="mt-2 divide-y divide-marea-100 rounded-lg border border-marea-100">
            {r.pacientes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link to={`/admin/pacientes/${p.id}`} className="rounded text-marea-800 underline-offset-4 hover:underline">{p.nombres} {p.apellidos}</Link>
                <Button variante="texto" className="text-danger hover:bg-danger-soft" aria-label={`Quitar a ${p.nombres} ${p.apellidos}`} title="Quitar"
                  disabled={desasociar.isPending}
                  onClick={() => accion(() => desasociar.mutateAsync({ responsableId: r.id, pacienteId: p.id }), `${p.nombres} ya no está asociado a ${r.nombres}`)}>
                  <UserMinus className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="agregar">
        <h3 id="agregar" className="mb-2 text-sm font-semibold text-marea-900">Asociar otro paciente</h3>
        <BuscadorAsociar
          etiqueta="Buscar paciente"
          placeholder="Buscar paciente por nombre o teléfono"
          onBuscar={alBuscar}
          asociando={asociar.isPending}
          resultados={{
            cargando: buscando.isFetching,
            error: buscando.isError,
            opciones: (buscando.data?.items ?? []).map((p) => ({
              id: p.id,
              titulo: `${p.nombres} ${p.apellidos}`,
              detalle: p.esMenor ? "Menor de edad" : "Mayor de edad",
              deshabilitada: asociados.has(p.id),
            })),
          }}
          onElegir={(o) => void accion(() => asociar.mutateAsync({ responsableId: r.id, pacienteId: o.id }), `${r.nombres} ahora es responsable de ${o.titulo}`)}
        />
      </section>
    </div>
  );
}

type Dialogo = { tipo: "formulario"; responsable?: Responsable } | { tipo: "pacientes"; responsable: Responsable } | null;

export default function Responsables() {
  useDocumentTitle("Responsables", "SIGCA");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const cambiarParams = (cambios: Record<string, string | undefined>) =>
    setParams((actual) => {
      const s = new URLSearchParams(actual);
      for (const [k, v] of Object.entries(cambios)) (v ? s.set(k, v) : s.delete(k));
      return s;
    }, { replace: true });

  const [texto, setTexto] = useState(q);
  const retrasado = useDebounce(texto, 300);
  useEffect(() => {
    if (retrasado.trim() !== q) cambiarParams({ q: retrasado.trim() || undefined, page: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrasado]);

  const { data, isPending, isError, error, refetch, isFetching } = useResponsables({ q: q || undefined, page, limit: POR_PAGINA });
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = () => setDialogo(null);

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        titulo="Responsables"
        descripcion="Madres, padres y tutores de los pacientes. Un responsable puede estar asociado a varios pacientes."
        accion={
          <Button onClick={() => setDialogo({ tipo: "formulario" })}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo responsable
          </Button>
        }
      />

      <div className="mt-8">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, correo o teléfono"
            aria-label="Buscar responsable" className={claseControl(false, "pl-10")} />
        </div>
      </div>

      {isPending && <Cargando texto="Cargando responsables…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}

      {data && data.items.length === 0 && (
        <Vacio titulo={q ? "Ningún responsable coincide con la búsqueda" : "Todavía no hay responsables registrados"}>
          {q && <Button variante="contorno" onClick={() => { setTexto(""); setParams({}, { replace: true }); }}>Quitar búsqueda</Button>}
        </Vacio>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={`mt-4 overflow-x-auto rounded-xl border border-marea-100 bg-white transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Responsables registrados</caption>
              <thead className="border-b border-marea-100 bg-marea-50 text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Responsable</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contacto</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pacientes</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marea-100">
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <div className="flex items-center gap-3">
                        <Avatar nombres={r.nombres} apellidos={r.apellidos} url={r.fotoUrl} />
                        <div>
                          <p className="font-medium text-ink">{r.nombres} {r.apellidos}</p>
                          <p className="text-ink-soft">{r.parentesco}</p>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3">
                      <p>{r.telefono}</p>
                      <p className="text-ink-soft">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.pacientes.length === 0 ? (
                        <span className="text-ink-soft">Sin pacientes</span>
                      ) : (
                        <ul className="flex flex-wrap gap-1.5">
                          {r.pacientes.map((p) => (
                            <li key={p.id}>
                              <Link to={`/admin/pacientes/${p.id}`} className="rounded-full bg-marea-100 px-2.5 py-1 text-xs font-medium text-marea-800 hover:bg-marea-200">{p.nombres} {p.apellidos}</Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variante="texto" aria-label={`Editar a ${r.nombres} ${r.apellidos}`} title="Editar" onClick={() => setDialogo({ tipo: "formulario", responsable: r })}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button variante="texto" aria-label={`Gestionar pacientes de ${r.nombres} ${r.apellidos}`} title="Gestionar pacientes" onClick={() => setDialogo({ tipo: "pacientes", responsable: r })}>
                          <UsersRound className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion page={data.page} pages={data.pages} total={data.total} etiqueta="responsables" onCambiar={(n) => cambiarParams({ page: n > 1 ? String(n) : undefined })} />
        </>
      )}

      <Modal abierto={dialogo?.tipo === "formulario"} onCerrar={cerrar} titulo={dialogo?.tipo === "formulario" && dialogo.responsable ? "Editar responsable" : "Nuevo responsable"}>
        {dialogo?.tipo === "formulario" && <FormularioResponsable responsable={dialogo.responsable} onCerrar={cerrar} />}
      </Modal>

      <Modal abierto={dialogo?.tipo === "pacientes"} onCerrar={cerrar} titulo="Pacientes del responsable"
        descripcion={dialogo?.tipo === "pacientes" ? `${dialogo.responsable.nombres} ${dialogo.responsable.apellidos}` : undefined}>
        {dialogo?.tipo === "pacientes" && <GestionPacientes responsableId={dialogo.responsable.id} />}
      </Modal>
    </div>
  );
}
