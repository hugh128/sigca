import { MensajeContacto } from "../models/MensajeContacto";
import type { DatosContacto } from "../schemas/contacto.schema";
import { armarPagina } from "../utils/paginar";

export async function crear(datos: DatosContacto) {
  await MensajeContacto.create(datos);
}

export async function listar({ page, limit }: { page: number; limit: number }) {
  const [items, total] = await Promise.all([
    MensajeContacto.find().sort({ fecha: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    MensajeContacto.countDocuments(),
  ]);
  return armarPagina(items, total, page, limit);
}
