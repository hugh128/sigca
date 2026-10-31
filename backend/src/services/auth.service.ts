import { Usuario } from "../models/Usuario";
import { AppError } from "../utils/AppError";
import { firmarToken } from "../utils/jwt";
import { compararPassword, HASH_FALSO } from "../utils/password";

export async function login(email: string, password: string) {
  const usuario = await Usuario.findOne({ email }).select("+passwordHash");

  // Siempre se compara contra algun hash para que el tiempo de respuesta sea
  // similar exista o no el correo.
  const passwordOk = await compararPassword(password, usuario?.passwordHash ?? HASH_FALSO);
  if (!usuario || !passwordOk) throw AppError.unauthorized("Credenciales inválidas");

  // RN-08: los usuarios inactivos no pueden iniciar sesion.
  if (!usuario.activo) throw AppError.forbidden("Tu usuario esta inactivo. Contacta al administrador");

  const token = firmarToken({ sub: usuario.id, rol: usuario.rol });
  return { token, usuario: usuario.toJSON() };
}
