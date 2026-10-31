import { useForm } from "@tanstack/react-form";
import { Clock, Pencil, Plus, Power, PowerOff, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useActualizarServicio, useCambiarEstadoServicio, useCrearServicio, useServiciosAdmin } from "@/api/servicios";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { ControlImagen } from "@/components/forms/ControlImagen";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { claseControl, TextField } from "@/components/forms/TextField";
import { MarcaOndas } from "@/components/public/Marca";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { centavosAQuetzales } from "@/lib/dinero";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { formatearDuracion, formatearQuetzales } from "@/lib/format";
import { normalizar } from "@/lib/texto";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { servicioFormSchema } from "@/schemas/servicios";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { Servicio } from "@/types/api";

type Dialogo = { tipo: "formulario"; servicio?: Servicio } | { tipo: "desactivar"; servicio: Servicio } | null;

function FormularioServicio({ servicio, onCerrar }: { servicio?: Servicio; onCerrar: () => void }) {
  const crear = useCrearServicio();
  const actualizar = useActualizarServicio();

  const form = useForm({
    defaultValues: {
      nombre: servicio?.nombre ?? "",
      descripcion: servicio?.descripcion ?? "",
      duracionMin: servicio ? String(servicio.duracionMin) : "",
      precio: servicio?.precioCentavos ? centavosAQuetzales(servicio.precioCentavos) : "",
      imagenUrl: servicio?.imagenUrl ?? "",
      imagenKey: servicio?.imagenKey ?? "",
    },
    validators: {
      onBlur: servicioFormSchema,
      onSubmit: servicioFormSchema,
      onSubmitAsync: async ({ value }) => {
        // Ya paso la validacion: aqui se convierten los textos a lo que espera la API (minutos y centavos).
        const v = servicioFormSchema.parse(value);
        const datos = { nombre: v.nombre, descripcion: v.descripcion, duracionMin: v.duracionMin, precioCentavos: v.precio, imagenUrl: v.imagenUrl, imagenKey: v.imagenKey };
        try {
          if (servicio) await actualizar.mutateAsync({ id: servicio.id, ...datos });
          else await crear.mutateAsync(datos);
        } catch (e) {
          const r = erroresDeServidor(e);
          // La API nombra el campo "precioCentavos"; en el formulario se llama "precio".
          if (r.fields.precioCentavos) { r.fields.precio = r.fields.precioCentavos; delete r.fields.precioCentavos; }
          return r;
        }
        return undefined;
      },
    },
    onSubmit: () => {
      toast.exito(servicio ? "Servicio actualizado" : "Servicio creado");
      onCerrar();
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(s) => s.errors}>{(errores) => <ErrorFormulario errores={errores} />}</form.Subscribe>
      <form.Field name="nombre">{(field) => <TextField field={field} label="Nombre del servicio" autoFocus />}</form.Field>
      <form.Field name="descripcion">{(field) => <TextAreaField field={field} label="Descripción" />}</form.Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="duracionMin">
          {(field) => <TextField field={field} label="Duración (minutos)" inputMode="numeric" placeholder="50" />}
        </form.Field>
        <form.Field name="precio">
          {(field) => <TextField field={field} label="Precio" prefijo="Q" inputMode="decimal" placeholder="250.00" />}
        </form.Field>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">Imagen (opcional)</p>
        <ControlImagen form={form} nombreUrl="imagenUrl" nombreKey="imagenKey" carpeta="servicios" etiqueta="Servicio" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variante="texto" onClick={onCerrar}>Cancelar</Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => <BotonEnviar enviando={enviando} texto={servicio ? "Guardar cambios" : "Crear servicio"} />}
        </form.Subscribe>
      </div>
    </form>
  );
}

type FiltroEstado = "todos" | "activos" | "inactivos";

export default function ServiciosAdmin() {
  useDocumentTitle("Servicios", "SIGCA");
  const esAdmin = useAuthStore((s) => s.usuario?.rol === "ADMINISTRADOR");
  const { data, isPending, isError, error, refetch } = useServiciosAdmin();
  const cambiarEstado = useCambiarEstadoServicio();

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = () => setDialogo(null);

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    return (data ?? []).filter(
      (s) =>
        (!q || normalizar(s.nombre).includes(q) || normalizar(s.descripcion).includes(q)) &&
        (estado === "todos" || (estado === "activos" ? s.estado === "ACTIVO" : s.estado === "INACTIVO")),
    );
  }, [data, busqueda, estado]);

  const hayFiltros = busqueda !== "" || estado !== "todos";

  const cambiar = async (s: Servicio, nuevo: Servicio["estado"]) => {
    try {
      await cambiarEstado.mutateAsync({ id: s.id, estado: nuevo });
      toast.exito(nuevo === "ACTIVO" ? `«${s.nombre}» vuelve a estar disponible` : `«${s.nombre}» fue desactivado`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cambiar el estado del servicio");
    }
    cerrar();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        titulo="Servicios"
        descripcion={esAdmin ? "Catálogo de servicios, con duración y precio." : "Consulta de servicios, su duración y su precio."}
        accion={
          esAdmin && (
            <Button onClick={() => setDialogo({ tipo: "formulario" })}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo servicio
            </Button>
          )
        }
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar servicio"
            aria-label="Buscar servicio" className={claseControl(false, "pl-10")} />
        </div>
        <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)} className={claseControl(false, "w-auto")}>
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      {isPending && <Cargando texto="Cargando servicios…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}

      {data && filtrados.length === 0 && (
        <Vacio titulo={hayFiltros ? "Ningún servicio coincide con los filtros" : "Todavía no hay servicios"}>
          {hayFiltros ? (
            <Button variante="contorno" onClick={() => { setBusqueda(""); setEstado("todos"); }}>Quitar filtros</Button>
          ) : esAdmin ? "Crea el primero con el botón «Nuevo servicio»." : "Pide al administrador que registre los servicios."}
        </Vacio>
      )}

      {filtrados.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-marea-100 bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Servicios del centro</caption>
            <thead className="border-b border-marea-100 bg-marea-50 text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Servicio</th>
                <th scope="col" className="px-4 py-3 font-medium">Duración</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Precio</th>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                {esAdmin && <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-marea-100">
              {filtrados.map((s) => (
                <tr key={s.id} className={s.estado === "INACTIVO" ? "bg-paper" : undefined}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <div className="flex items-center gap-3">
                      {s.imagenUrl ? (
                        <img src={s.imagenUrl} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-marea-100 text-marea-500"><MarcaOndas className="size-6" /></div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{s.nombre}</p>
                        <p className="line-clamp-1 max-w-md text-ink-soft">{s.descripcion}</p>
                      </div>
                    </div>
                  </th>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-ink-soft" aria-hidden="true" />{formatearDuracion(s.duracionMin)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatearQuetzales(s.precioCentavos ?? 0)}</td>
                  <td className="px-4 py-3"><Badge tono={s.estado === "ACTIVO" ? "ok" : "neutro"}>{s.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Badge></td>
                  {esAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variante="texto" aria-label={`Editar ${s.nombre}`} title="Editar" onClick={() => setDialogo({ tipo: "formulario", servicio: s })}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        {s.estado === "ACTIVO" ? (
                          <Button variante="texto" aria-label={`Desactivar ${s.nombre}`} title="Desactivar" onClick={() => setDialogo({ tipo: "desactivar", servicio: s })}>
                            <PowerOff className="size-4" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button variante="texto" aria-label={`Activar ${s.nombre}`} title="Activar" disabled={cambiarEstado.isPending} onClick={() => cambiar(s, "ACTIVO")}>
                            <Power className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={dialogo?.tipo === "formulario"} onCerrar={cerrar} titulo={dialogo?.tipo === "formulario" && dialogo.servicio ? "Editar servicio" : "Nuevo servicio"}>
        {dialogo?.tipo === "formulario" && <FormularioServicio servicio={dialogo.servicio} onCerrar={cerrar} />}
      </Modal>

      <ConfirmDialog
        abierto={dialogo?.tipo === "desactivar"}
        titulo={dialogo?.tipo === "desactivar" ? `¿Desactivar «${dialogo.servicio.nombre}»?` : ""}
        textoConfirmar="Desactivar servicio"
        peligro
        cargando={cambiarEstado.isPending}
        onCancelar={cerrar}
        onConfirmar={() => dialogo?.tipo === "desactivar" && void cambiar(dialogo.servicio, "INACTIVO")}
      >
        Dejará de mostrarse en el portal y no podrá elegirse para nuevas citas. Las citas ya registradas no se modifican y puedes volver a activarlo cuando quieras.
      </ConfirmDialog>
    </div>
  );
}
