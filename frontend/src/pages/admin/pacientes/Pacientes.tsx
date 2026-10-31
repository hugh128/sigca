import { Pencil, Plus, Power, PowerOff, Search, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useCambiarEstadoPaciente, usePacientes } from "@/api/pacientes";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { claseControl } from "@/components/forms/TextField";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { ApiError } from "@/lib/api";
import { textoEdad } from "@/lib/fechas";
import { useDebounce } from "@/lib/useDebounce";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { toast } from "@/store/toast";
import type { Paciente } from "@/types/api";
import { FormularioPaciente } from "./FormularioPaciente";

const POR_PAGINA = 15;

type Dialogo = { tipo: "formulario"; paciente?: Paciente } | { tipo: "desactivar"; paciente: Paciente } | null;

export default function Pacientes() {
  useDocumentTitle("Pacientes", "SIGCA");
  const navigate = useNavigate();
  // Los filtros viven en la URL: al abrir una ficha y volver, la lista queda como estaba.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const estado = (params.get("estado") ?? "") as "" | "ACTIVO" | "INACTIVO";
  const edad = (params.get("edad") ?? "") as "" | "menores" | "mayores";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const cambiarParams = (cambios: Record<string, string | undefined>) =>
    setParams(
      (actual) => {
        const siguiente = new URLSearchParams(actual);
        for (const [k, v] of Object.entries(cambios)) {
          if (v) siguiente.set(k, v);
          else siguiente.delete(k);
        }
        return siguiente;
      },
      { replace: true },
    );

  const [texto, setTexto] = useState(q);
  const retrasado = useDebounce(texto, 300);
  useEffect(() => {
    if (retrasado.trim() !== q) cambiarParams({ q: retrasado.trim() || undefined, page: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrasado]);

  const { data, isPending, isError, error, refetch, isFetching } = usePacientes({
    q: q || undefined,
    estado: estado || undefined,
    menores: edad === "" ? undefined : edad === "menores",
    page,
    limit: POR_PAGINA,
  });
  const cambiarEstado = useCambiarEstadoPaciente();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = () => setDialogo(null);
  const hayFiltros = q !== "" || estado !== "" || edad !== "";

  const cambiar = async (p: Paciente, nuevo: Paciente["estado"]) => {
    try {
      await cambiarEstado.mutateAsync({ id: p.id, estado: nuevo });
      toast.exito(nuevo === "ACTIVO" ? `${p.nombres} ${p.apellidos} fue reactivado` : `${p.nombres} ${p.apellidos} fue desactivado`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cambiar el estado del paciente");
    }
    cerrar();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        titulo="Pacientes"
        descripcion="Registro de pacientes. Los pacientes no se eliminan: se desactivan y su historial se conserva."
        accion={
          <Button onClick={() => setDialogo({ tipo: "formulario" })}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo paciente
          </Button>
        }
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, apellido o teléfono"
            aria-label="Buscar paciente" className={claseControl(false, "pl-10")} />
        </div>
        <select aria-label="Filtrar por edad" value={edad} onChange={(e) => cambiarParams({ edad: e.target.value || undefined, page: undefined })} className={claseControl(false, "w-auto")}>
          <option value="">Todas las edades</option>
          <option value="menores">Menores de 18</option>
          <option value="mayores">Mayores de edad</option>
        </select>
        <select aria-label="Filtrar por estado" value={estado} onChange={(e) => cambiarParams({ estado: e.target.value || undefined, page: undefined })} className={claseControl(false, "w-auto")}>
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Solo activos</option>
          <option value="INACTIVO">Solo inactivos</option>
        </select>
      </div>

      {isPending && <Cargando texto="Cargando pacientes…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}

      {data && data.items.length === 0 && (
        <Vacio titulo={hayFiltros ? "Ningún paciente coincide con la búsqueda" : "Todavía no hay pacientes registrados"}>
          {hayFiltros ? (
            <Button variante="contorno" onClick={() => { setTexto(""); setParams({}, { replace: true }); }}>Quitar filtros</Button>
          ) : "Registra el primero con el botón «Nuevo paciente»."}
        </Vacio>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={`mt-4 overflow-x-auto rounded-xl border border-marea-100 bg-white transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Pacientes registrados</caption>
              <thead className="border-b border-marea-100 bg-marea-50 text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Paciente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Teléfono</th>
                  <th scope="col" className="px-4 py-3 font-medium">Responsables</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marea-100">
                {data.items.map((p) => {
                  const nombre = `${p.nombres} ${p.apellidos}`;
                  const sinResponsable = p.esMenor && p.responsables.length === 0;
                  return (
                    <tr key={p.id} className={p.estado === "INACTIVO" ? "bg-paper" : undefined}>
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <Avatar nombres={p.nombres} apellidos={p.apellidos} url={p.fotoUrl} />
                          <div className="min-w-0">
                            <Link to={`/admin/pacientes/${p.id}`} className="rounded font-medium text-marea-800 underline-offset-4 hover:underline">{nombre}</Link>
                            <p className="text-ink-soft">{textoEdad(p.edad)}{p.esMenor && " · menor de edad"}</p>
                          </div>
                        </div>
                      </th>
                      <td className="whitespace-nowrap px-4 py-3">{p.telefono}</td>
                      <td className="px-4 py-3">
                        {sinResponsable ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sol-100 px-2.5 py-1 text-xs font-medium text-ink">
                            <TriangleAlert className="size-3.5" aria-hidden="true" />
                            Menor sin responsable
                          </span>
                        ) : p.responsables.length === 0 ? (
                          <span className="text-ink-soft">—</span>
                        ) : (
                          <ul>
                            {p.responsables.map((r) => (
                              <li key={r.id}>{r.nombres} {r.apellidos} <span className="text-ink-soft">({r.parentesco})</span></li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge tono={p.estado === "ACTIVO" ? "ok" : "neutro"}>{p.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variante="texto" aria-label={`Editar a ${nombre}`} title="Editar" onClick={() => setDialogo({ tipo: "formulario", paciente: p })}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          {p.estado === "ACTIVO" ? (
                            <Button variante="texto" aria-label={`Desactivar a ${nombre}`} title="Desactivar" onClick={() => setDialogo({ tipo: "desactivar", paciente: p })}>
                              <PowerOff className="size-4" aria-hidden="true" />
                            </Button>
                          ) : (
                            <Button variante="texto" aria-label={`Reactivar a ${nombre}`} title="Reactivar" disabled={cambiarEstado.isPending} onClick={() => cambiar(p, "ACTIVO")}>
                              <Power className="size-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacion page={data.page} pages={data.pages} total={data.total} etiqueta="pacientes" onCambiar={(n) => cambiarParams({ page: n > 1 ? String(n) : undefined })} />
        </>
      )}

      <Modal abierto={dialogo?.tipo === "formulario"} onCerrar={cerrar} ancho="lg" titulo={dialogo?.tipo === "formulario" && dialogo.paciente ? "Editar paciente" : "Nuevo paciente"}>
        {dialogo?.tipo === "formulario" && (
          <FormularioPaciente
            paciente={dialogo.paciente}
            onCerrar={cerrar}
            // al registrar uno nuevo se abre su ficha, donde se le asocian los responsables
            onGuardado={(p) => { if (!dialogo.paciente) navigate(`/admin/pacientes/${p.id}`); }}
          />
        )}
      </Modal>

      <ConfirmDialog
        abierto={dialogo?.tipo === "desactivar"}
        titulo={dialogo?.tipo === "desactivar" ? `¿Desactivar a ${dialogo.paciente.nombres} ${dialogo.paciente.apellidos}?` : ""}
        textoConfirmar="Desactivar paciente"
        peligro
        cargando={cambiarEstado.isPending}
        onCancelar={cerrar}
        onConfirmar={() => dialogo?.tipo === "desactivar" && void cambiar(dialogo.paciente, "INACTIVO")}
      >
        No podrá recibir nuevas citas. Su información, sus citas y sus pagos se conservan, y puedes reactivarlo cuando quieras.
      </ConfirmDialog>
    </div>
  );
}
