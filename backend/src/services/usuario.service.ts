import type { QueryFilter } from "mongoose";
import { Usuario, type IUsuario, type Rol, type UsuarioDoc } from "../models/Usuario";
import { AppError } from "../utils/AppError";
import { hashPassword } from "../utils/password";
import { contarCitasFuturas } from "./cita.service";

export interface FiltrosUsuarios {
  rol?: Rol;
  activo?: boolean;
  q?: string;
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listar(filtros: FiltrosUsuarios) {
  const query: QueryFilter<IUsuario> = {};
  if (filtros.rol) query.rol = filtros.rol;
  if (filtros.activo !== undefined) query.activo = filtros.activo;
  if (filtros.q) {
    const rx = new RegExp(escapar(filtros.q), "i");
    query.$or = [{ nombre: rx }, { email: rx }];
  }
  return Usuario.find(query).sort({ nombre: 1 });
}

/** Profesionales activos: lo necesita recepcion para asignar citas. Solo datos basicos. */
export async function listarProfesionalesActivos() {
  return Usuario.find({ rol: "PROFESIONAL", activo: true }).select("nombre email").sort({ nombre: 1 });
}

export async function obtener(id: string) {
  const usuario = await Usuario.findById(id);
  if (!usuario) throw AppError.notFound("Usuario no encontrado");
  return usuario;
}

export async function crear(datos: { nombre: string; email: string; password: string; rol: Rol }) {
  if (await Usuario.exists({ email: datos.email })) {
    throw AppError.conflict("Ya existe un usuario con ese correo electrónico");
  }
  const { password, ...resto } = datos;
  return Usuario.create({ ...resto, passwordHash: await hashPassword(password) });
}

/** Un administrador no puede quitarse a si mismo el acceso (evita quedarse sin administradores). */
function protegerAutoBloqueo(actor: UsuarioDoc, objetivoId: string, cambios: { rol?: Rol; activo?: boolean }) {
  if (actor.id !== objetivoId) return;
  if (cambios.activo === false) throw AppError.unprocessable("No puedes desactivar tu propio usuario");
  if (cambios.rol && cambios.rol !== "ADMINISTRADOR") {
    throw AppError.unprocessable("No puedes quitarte a ti mismo el rol de administrador");
  }
}

export async function actualizar(
  id: string,
  cambios: { nombre?: string; email?: string; rol?: Rol; activo?: boolean },
  actor: UsuarioDoc,
) {
  protegerAutoBloqueo(actor, id, cambios);
  const usuario = await obtener(id);

  if (cambios.email && cambios.email !== usuario.email) {
    if (await Usuario.exists({ email: cambios.email, _id: { $ne: id } })) {
      throw AppError.conflict("Ya existe un usuario con ese correo electrónico");
    }
  }

  // Un profesional con citas pendientes o confirmadas no puede desactivarse ni dejar de ser profesional
  const dejaDeAtender = usuario.rol === "PROFESIONAL" && (cambios.activo === false || (cambios.rol !== undefined && cambios.rol !== "PROFESIONAL"));
  if (dejaDeAtender) {
    const futuras = await contarCitasFuturas({ profesional: id });
    if (futuras > 0) {
      throw AppError.unprocessable(
        `No se puede: ${usuario.nombre} tiene ${futuras} cita${futuras === 1 ? "" : "s"} pendiente${futuras === 1 ? "" : "s"} o confirmada${futuras === 1 ? "" : "s"}. Reprográmalas o cancélalas primero`,
      );
    }
  }

  usuario.set(cambios);
  await usuario.save();
  return usuario;
}

export async function restablecerPassword(id: string, nuevoPassword: string) {
  const usuario = await obtener(id);
  usuario.passwordHash = await hashPassword(nuevoPassword);
  usuario.passwordChangedAt = new Date(); // invalida los tokens anteriores
  await usuario.save();
}
