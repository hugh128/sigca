import { useForm } from "@tanstack/react-form";
import { KeyRound, Pencil, Plus, Power, Search, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useActualizarUsuario, useCambiarEstadoUsuario, useCrearUsuario, useRestablecerPassword, useUsuarios,
} from "@/api/usuarios";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { BotonEnviar } from "@/components/forms/BotonEnviar";
import { ErrorFormulario } from "@/components/forms/ErrorFormulario";
import { SelectField } from "@/components/forms/SelectField";
import { claseControl, TextField } from "@/components/forms/TextField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Cargando, ErrorCarga, Vacio } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { OPCIONES_ROL, ROL_ETIQUETA } from "@/lib/roles";
import { normalizar } from "@/lib/texto";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { crearUsuarioSchema, editarUsuarioSchema, restablecerPasswordSchema } from "@/schemas/usuarios";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { Rol, Usuario } from "@/types/api";

type Dialogo =
  | { tipo: "formulario"; usuario?: Usuario }
  | { tipo: "password"; usuario: Usuario }
  | { tipo: "desactivar"; usuario: Usuario }
  | null;

/* ---------- Crear / editar ---------- */
function FormularioUsuario({ usuario, onCerrar }: { usuario?: Usuario; onCerrar: () => void }) {
  const esEdicion = Boolean(usuario);
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();

  const form = useForm({
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      email: usuario?.email ?? "",
      rol: (usuario?.rol ?? "RECEPCIONISTA") as Rol,
      password: "",
    },
    validators: {
      onBlur: esEdicion ? editarUsuarioSchema : crearUsuarioSchema,
      onSubmit: esEdicion ? editarUsuarioSchema : crearUsuarioSchema,
      // Se envia al servidor; si responde con error, se muestra bajo el campo correspondiente.
      onSubmitAsync: async ({ value }) => {
        const datos = { nombre: value.nombre.trim(), email: value.email.trim(), rol: value.rol };
        try {
          if (usuario) await actualizar.mutateAsync({ id: usuario.id, ...datos });
          else await crear.mutateAsync({ ...datos, password: value.password });
        } catch (e) {
          return erroresDeServidor(e, "email");
        }
        return undefined;
      },
    },
    onSubmit: () => {
      toast.exito(esEdicion ? "Cambios guardados" : "Usuario creado");
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
      <form.Field name="nombre">{(field) => <TextField field={field} label="Nombre completo" autoComplete="off" autoFocus />}</form.Field>
      <form.Field name="email">{(field) => <TextField field={field} label="Correo electrónico" type="email" autoComplete="off" />}</form.Field>
      <form.Field name="rol">{(field) => <SelectField field={field} label="Rol" opciones={OPCIONES_ROL} />}</form.Field>
      {!esEdicion && (
        <form.Field name="password">
          {(field) => (
            <TextField field={field} label="Contraseña inicial" type="password" autoComplete="new-password"
              ayuda="Mínimo 8 caracteres, con al menos una letra y un número." />
          )}
        </form.Field>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variante="texto" onClick={onCerrar}>Cancelar</Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => <BotonEnviar enviando={enviando} texto={esEdicion ? "Guardar cambios" : "Crear usuario"} />}
        </form.Subscribe>
      </div>
    </form>
  );
}

/* ---------- Restablecer contrasena ---------- */
function FormularioPassword({ usuario, onCerrar }: { usuario: Usuario; onCerrar: () => void }) {
  const restablecer = useRestablecerPassword();
  const form = useForm({
    defaultValues: { password: "", confirmar: "" },
    validators: {
      onBlur: restablecerPasswordSchema,
      onSubmit: restablecerPasswordSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await restablecer.mutateAsync({ id: usuario.id, password: value.password });
        } catch (e) {
          return erroresDeServidor(e, "password");
        }
        return undefined;
      },
    },
    onSubmit: () => {
      toast.exito(`Contraseña restablecida para ${usuario.nombre}`);
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
      <p className="text-sm text-ink-soft">
        Si {usuario.nombre} tiene una sesión abierta, se cerrará y deberá ingresar con la contraseña nueva.
      </p>
      <form.Subscribe selector={(s) => s.errors}>{(errores) => <ErrorFormulario errores={errores} />}</form.Subscribe>
      <form.Field name="password">
        {(field) => <TextField field={field} label="Contraseña nueva" type="password" autoComplete="new-password" autoFocus
          ayuda="Mínimo 8 caracteres, con al menos una letra y un número." />}
      </form.Field>
      <form.Field name="confirmar">
        {(field) => <TextField field={field} label="Repite la contraseña nueva" type="password" autoComplete="new-password" />}
      </form.Field>
      <div className="flex justify-end gap-3 pt-2">
        <Button variante="texto" onClick={onCerrar}>Cancelar</Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => <BotonEnviar enviando={enviando} texto="Restablecer contraseña" />}
        </form.Subscribe>
      </div>
    </form>
  );
}

/* ---------- Pagina ---------- */
type FiltroEstado = "todos" | "activos" | "inactivos";

export default function Usuarios() {
  useDocumentTitle("Usuarios", "SIGCA");
  const miId = useAuthStore((s) => s.usuario?.id);
  const { data, isPending, isError, error, refetch } = useUsuarios();
  const cambiarEstado = useCambiarEstadoUsuario();

  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState<Rol | "">("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = () => setDialogo(null);

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    return (data ?? []).filter(
      (u) =>
        (!q || normalizar(u.nombre).includes(q) || normalizar(u.email).includes(q)) &&
        (!rol || u.rol === rol) &&
        (estado === "todos" || (estado === "activos" ? u.activo : !u.activo)),
    );
  }, [data, busqueda, rol, estado]);

  const hayFiltros = busqueda !== "" || rol !== "" || estado !== "todos";

  const cambiar = async (u: Usuario, activo: boolean) => {
    try {
      await cambiarEstado.mutateAsync({ id: u.id, activo });
      toast.exito(activo ? `${u.nombre} ya puede iniciar sesión` : `${u.nombre} fue desactivado`);
      cerrar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cambiar el estado del usuario");
      cerrar();
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Personal con acceso al sistema."
        accion={
          <Button onClick={() => setDialogo({ tipo: "formulario" })}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Button>
        }
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar por nombre o correo"
            className={claseControl(false, "pl-10")}
          />
        </div>
        <select aria-label="Filtrar por rol" value={rol} onChange={(e) => setRol(e.target.value as Rol | "")} className={claseControl(false, "w-auto")}>
          <option value="">Todos los roles</option>
          {OPCIONES_ROL.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
        <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)} className={claseControl(false, "w-auto")}>
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      {isPending && <Cargando texto="Cargando usuarios…" />}
      {isError && <ErrorCarga error={error} onReintentar={() => refetch()} />}

      {data && filtrados.length === 0 && (
        <Vacio titulo={hayFiltros ? "Ningún usuario coincide con los filtros" : "Todavía no hay usuarios"}>
          {hayFiltros ? (
            <Button variante="contorno" onClick={() => { setBusqueda(""); setRol(""); setEstado("todos"); }}>Quitar filtros</Button>
          ) : "Crea el primero con el botón «Nuevo usuario»."}
        </Vacio>
      )}

      {filtrados.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-marea-100 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Usuarios del sistema</caption>
            <thead className="border-b border-marea-100 bg-marea-50 text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
                <th scope="col" className="px-4 py-3 font-medium">Rol</th>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marea-100">
              {filtrados.map((u) => {
                const esYo = u.id === miId;
                return (
                  <tr key={u.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <p className="font-medium text-ink">{u.nombre}{esYo && <span className="ml-2 text-xs font-normal text-ink-soft">(tú)</span>}</p>
                      <p className="text-ink-soft">{u.email}</p>
                    </th>
                    <td className="px-4 py-3"><Badge tono="info">{ROL_ETIQUETA[u.rol]}</Badge></td>
                    <td className="px-4 py-3"><Badge tono={u.activo ? "ok" : "neutro"}>{u.activo ? "Activo" : "Inactivo"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variante="texto" aria-label={`Editar a ${u.nombre}`} title="Editar" onClick={() => setDialogo({ tipo: "formulario", usuario: u })}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button variante="texto" aria-label={`Restablecer contraseña de ${u.nombre}`} title="Restablecer contraseña" onClick={() => setDialogo({ tipo: "password", usuario: u })}>
                          <KeyRound className="size-4" aria-hidden="true" />
                        </Button>
                        {u.activo ? (
                          <Button
                            variante="texto"
                            aria-label={`Desactivar a ${u.nombre}`}
                            title={esYo ? "No puedes desactivar tu propio usuario" : "Desactivar"}
                            disabled={esYo}
                            onClick={() => setDialogo({ tipo: "desactivar", usuario: u })}
                          >
                            <Power className="size-4" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button variante="texto" aria-label={`Activar a ${u.nombre}`} title="Activar" disabled={cambiarEstado.isPending} onClick={() => cambiar(u, true)}>
                            <UserCheck className="size-4" aria-hidden="true" />
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
      )}

      <Modal
        abierto={dialogo?.tipo === "formulario"}
        onCerrar={cerrar}
        titulo={dialogo?.tipo === "formulario" && dialogo.usuario ? "Editar usuario" : "Nuevo usuario"}
      >
        {dialogo?.tipo === "formulario" && <FormularioUsuario usuario={dialogo.usuario} onCerrar={cerrar} />}
      </Modal>

      <Modal abierto={dialogo?.tipo === "password"} onCerrar={cerrar} titulo="Restablecer contraseña" descripcion={dialogo?.tipo === "password" ? dialogo.usuario.email : undefined}>
        {dialogo?.tipo === "password" && <FormularioPassword usuario={dialogo.usuario} onCerrar={cerrar} />}
      </Modal>

      <ConfirmDialog
        abierto={dialogo?.tipo === "desactivar"}
        titulo={dialogo?.tipo === "desactivar" ? `¿Desactivar a ${dialogo.usuario.nombre}?` : ""}
        textoConfirmar="Desactivar usuario"
        peligro
        cargando={cambiarEstado.isPending}
        onCancelar={cerrar}
        onConfirmar={() => dialogo?.tipo === "desactivar" && void cambiar(dialogo.usuario, false)}
      >
        No podrá iniciar sesión y, si tiene una sesión abierta, se cerrará. Su historial se conserva y podrás activarlo de nuevo cuando quieras.
      </ConfirmDialog>
    </div>
  );
}
