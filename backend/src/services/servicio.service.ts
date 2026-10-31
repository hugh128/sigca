import type { QueryFilter } from "mongoose";
import { Servicio, type EstadoServicio, type IServicio } from "../models/Servicio";
import { AppError } from "../utils/AppError";

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Visitantes (sin sesion): solo servicios ACTIVOS y sin precio (el portal publico no lo muestra).
 * Personal autenticado: todos los servicios, con precio.
 */
export async function listar(esPersonal: boolean, filtros: { estado?: EstadoServicio; q?: string }) {
  const query: QueryFilter<IServicio> = {};
  if (esPersonal) {
    if (filtros.estado) query.estado = filtros.estado;
  } else {
    query.estado = "ACTIVO";
  }
  if (filtros.q) {
    const rx = new RegExp(escapar(filtros.q), "i");
    query.$or = [{ nombre: rx }, { descripcion: rx }];
  }
  const consulta = Servicio.find(query).sort({ nombre: 1 });
  if (!esPersonal) consulta.select("-precioCentavos -imagenKey");
  return consulta;
}

export async function obtener(id: string, esPersonal: boolean) {
  const consulta = Servicio.findById(id);
  if (!esPersonal) consulta.select("-precioCentavos -imagenKey");
  const servicio = await consulta;
  if (!servicio || (!esPersonal && servicio.estado !== "ACTIVO")) {
    throw AppError.notFound("Servicio no encontrado");
  }
  return servicio;
}

export async function crear(datos: Partial<IServicio>) {
  return Servicio.create(datos);
}

export async function actualizar(id: string, cambios: Partial<IServicio>) {
  const servicio = await Servicio.findById(id);
  if (!servicio) throw AppError.notFound("Servicio no encontrado");
  servicio.set(cambios);
  await servicio.save(); // ejecuta las validaciones del esquema
  return servicio;
}

export async function cambiarEstado(id: string, estado: EstadoServicio) {
  return actualizar(id, { estado });
}
