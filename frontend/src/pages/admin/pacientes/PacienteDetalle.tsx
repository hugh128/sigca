import { ArrowLeft, Cake, CalendarDays, MapPin, Pencil, Phone, Plus, PowerOff, Power, TriangleAlert, UserMinus } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { useAsociarResponsable, useCambiarEstadoPaciente, useDesasociarResponsable, usePaciente } from "@/api/pacientes";
import { useResponsables } from "@/api/responsables";
import { BuscadorAsociar } from "@/components/forms/BuscadorAsociar";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Cargando, ErrorCarga } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { textoEdad } from "@/lib/fechas";
import { formatearFecha } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { toast } from "@/store/toast";
import type { ResponsableDePaciente } from "@/types/api";
import { FormularioResponsable } from "../responsables/FormularioResponsable";
import { FormularioPaciente } from "./FormularioPaciente";

const SEXO: Record<string, string> = { MASCULINO: "Masculino", FEMENINO: "Femenino", OTRO: "Otro" };

type Dialogo = "editar" | "desactivar" | "asociar" | "nuevoResponsable" | { quitar: ResponsableDePaciente } | null;

function Dato({ icono: Icono, etiqueta, children }: { icono: typeof Phone; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icono className="mt-0.5 size-4 shrink-0 text-marea-500" aria-hidden="true" />
      <div>
        <dt className="text-sm text-ink-soft">{etiqueta}</dt>
        <dd className="text-ink">{children}</dd>
      </div>
    </div>
  );
}

export default function PacienteDetalle() {
  const { id = "" } = useParams();
  const { data: p, isPending, isError, error, refetch } = usePaciente(id);
  useDocumentTitle(p ? `${p.nombres} ${p.apellidos}` : "Paciente", "SIGCA");

  const cambiarEstado = useCambiarEstadoPaciente();
  const asociar = useAsociarResponsable();
  const desasociar = useDesasociarResponsable();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [busqueda, setBusqueda] = useState("");
  const alBuscar = useCallback((q: string) => setBusqueda(q), []);
  const cerrar = () => setDialogo(null);
  const buscando = useResponsables({ q: busqueda || undefined, limit: 6 }, dialogo === "asociar");

  if (isPending) return <Cargando texto="Cargando paciente…" />;
  if (isError) return <ErrorCarga error={error} onReintentar={() => refetch()} />;

  const nombre = `${p.nombres} ${p.apellidos}`;
  const yaAsociados = new Set(p.responsables.map((r) => r.id));
  const sinResponsable = p.esMenor && p.responsables.length === 0;

  const cambiar = async (estado: "ACTIVO" | "INACTIVO") => {
    try {
      await cambiarEstado.mutateAsync({ id: p.id, estado });
      toast.exito(estado === "ACTIVO" ? `${nombre} fue reactivado` : `${nombre} fue desactivado`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cambiar el estado del paciente");
    }
    cerrar();
  };

  const asociarA = async (responsableId: string, titulo: string) => {
    try {
      await asociar.mutateAsync({ pacienteId: p.id, responsableId });
      toast.exito(`${titulo} ahora es responsable de ${p.nombres}`);
      cerrar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos asociar al responsable");
    }
  };

  const quitar = async (r: ResponsableDePaciente) => {
    try {
      await desasociar.mutateAsync({ pacienteId: p.id, responsableId: r.id });
      toast.exito(`${r.nombres} ${r.apellidos} ya no es responsable de ${p.nombres}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos quitar al responsable");
    }
    cerrar();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/pacientes" className="inline-flex items-center gap-1.5 rounded text-sm text-marea-700 underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a pacientes
      </Link>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar nombres={p.nombres} apellidos={p.apellidos} url={p.fotoUrl} tamano="lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-marea-900">{nombre}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
              {textoEdad(p.edad)}{p.esMenor && " · menor de edad"}
              <Badge tono={p.estado === "ACTIVO" ? "ok" : "neutro"}>{p.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variante="contorno" onClick={() => setDialogo("editar")}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
          {p.estado === "ACTIVO" ? (
            <Button variante="texto" onClick={() => setDialogo("desactivar")}>
              <PowerOff className="size-4" aria-hidden="true" />
              Desactivar
            </Button>
          ) : (
            <Button variante="texto" disabled={cambiarEstado.isPending} onClick={() => cambiar("ACTIVO")}>
              <Power className="size-4" aria-hidden="true" />
              Reactivar
            </Button>
          )}
        </div>
      </header>

      {sinResponsable && (
        <div role="alert" className="mt-6 flex gap-3 rounded-xl border-l-4 border-sol-500 bg-sol-100 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>{p.nombres} es menor de edad y todavía no tiene un responsable.</strong> Necesita al menos uno registrado antes de poder programar citas.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="datos">
          <h2 id="datos" className="text-lg font-semibold text-marea-900">Datos del paciente</h2>
          <dl className="mt-2 divide-y divide-marea-100 border-y border-marea-100">
            <Dato icono={Cake} etiqueta="Fecha de nacimiento">{formatearFecha(p.fechaNacimiento)} · {SEXO[p.sexo]}</Dato>
            <Dato icono={Phone} etiqueta="Teléfono">{p.telefono}</Dato>
            <Dato icono={MapPin} etiqueta="Dirección">{p.direccion}</Dato>
            <Dato icono={CalendarDays} etiqueta="Inicio del proceso">{formatearFecha(p.fechaInicio)}</Dato>
          </dl>
          {p.observaciones && (
            <div className="mt-5">
              <h3 className="text-sm font-medium text-ink-soft">Observaciones administrativas</h3>
              <p className="mt-1 whitespace-pre-line font-serif leading-relaxed">{p.observaciones}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="responsables">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="responsables" className="text-lg font-semibold text-marea-900">Responsables</h2>
            <div className="flex gap-2">
              <Button variante="contorno" onClick={() => setDialogo("asociar")}>Asociar existente</Button>
              <Button onClick={() => setDialogo("nuevoResponsable")}>
                <Plus className="size-4" aria-hidden="true" />
                Registrar nuevo
              </Button>
            </div>
          </div>

          {p.responsables.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-marea-200 px-4 py-6 text-center text-ink-soft">
              {p.esMenor ? "Aún no hay responsables registrados." : "Los pacientes mayores de edad no necesitan responsable, pero puedes registrar uno si lo desea."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-marea-100 rounded-xl border border-marea-100 bg-white">
              {p.responsables.map((r) => (
                <li key={r.id} className="flex items-start gap-3 p-4">
                  <Avatar nombres={r.nombres} apellidos={r.apellidos} url={r.fotoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{r.nombres} {r.apellidos} <span className="font-normal text-ink-soft">· {r.parentesco}</span></p>
                    <p className="text-sm text-ink-soft">{r.telefono} · {r.email}</p>
                    <p className="text-sm text-ink-soft">{r.direccion}</p>
                  </div>
                  <Button variante="texto" aria-label={`Quitar a ${r.nombres} ${r.apellidos} como responsable`} title="Quitar" className="text-danger hover:bg-danger-soft" onClick={() => setDialogo({ quitar: r })}>
                    <UserMinus className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal abierto={dialogo === "editar"} onCerrar={cerrar} ancho="lg" titulo="Editar paciente">
        {dialogo === "editar" && <FormularioPaciente paciente={p} onCerrar={cerrar} />}
      </Modal>

      <Modal abierto={dialogo === "nuevoResponsable"} onCerrar={cerrar} titulo="Registrar responsable" descripcion={`Se asociará a ${nombre}.`}>
        {dialogo === "nuevoResponsable" && <FormularioResponsable pacienteId={p.id} onCerrar={cerrar} />}
      </Modal>

      <Modal abierto={dialogo === "asociar"} onCerrar={cerrar} titulo="Asociar un responsable existente" descripcion={`Busca por nombre, correo o teléfono para asociarlo a ${nombre}.`}>
        {dialogo === "asociar" && (
          <BuscadorAsociar
            etiqueta="Buscar responsable"
            placeholder="Buscar por nombre, correo o teléfono"
            onBuscar={alBuscar}
            asociando={asociar.isPending}
            resultados={{
              cargando: buscando.isFetching,
              error: buscando.isError,
              opciones: (buscando.data?.items ?? []).map((r) => ({
                id: r.id,
                titulo: `${r.nombres} ${r.apellidos}`,
                detalle: `${r.parentesco} · ${r.telefono}`,
                deshabilitada: yaAsociados.has(r.id),
              })),
            }}
            onElegir={(o) => void asociarA(o.id, o.titulo)}
            vacio={<>No hay coincidencias. Puedes <button type="button" className="rounded text-marea-700 underline underline-offset-4" onClick={() => setDialogo("nuevoResponsable")}>registrar un responsable nuevo</button>.</>}
          />
        )}
      </Modal>

      <ConfirmDialog
        abierto={dialogo === "desactivar"}
        titulo={`¿Desactivar a ${nombre}?`}
        textoConfirmar="Desactivar paciente"
        peligro
        cargando={cambiarEstado.isPending}
        onCancelar={cerrar}
        onConfirmar={() => void cambiar("INACTIVO")}
      >
        No podrá recibir nuevas citas. Su información, sus citas y sus pagos se conservan, y puedes reactivarlo cuando quieras.
      </ConfirmDialog>

      <ConfirmDialog
        abierto={typeof dialogo === "object" && dialogo !== null}
        titulo={typeof dialogo === "object" && dialogo ? `¿Quitar a ${dialogo.quitar.nombres} ${dialogo.quitar.apellidos}?` : ""}
        textoConfirmar="Quitar responsable"
        peligro
        cargando={desasociar.isPending}
        onCancelar={cerrar}
        onConfirmar={() => typeof dialogo === "object" && dialogo && void quitar(dialogo.quitar)}
      >
        {typeof dialogo === "object" && dialogo && p.esMenor && p.responsables.length === 1
          ? `Es el único responsable de ${p.nombres}, que es menor de edad: quedará sin responsable y no podrá programar citas hasta registrar otro.`
          : "Solo se quita la relación con este paciente; el responsable sigue registrado y puede estar asociado a otros pacientes."}
      </ConfirmDialog>
    </div>
  );
}
