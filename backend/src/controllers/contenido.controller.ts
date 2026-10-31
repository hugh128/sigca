import type { RequestHandler } from "express";
import type { ClaveContenido } from "../models/ContenidoInstitucional";
import * as contenidoService from "../services/contenido.service";

export const obtenerTodo: RequestHandler = async (_req, res) => {
  res.json(await contenidoService.obtenerTodo());
};

export const obtener: RequestHandler = async (req, res) => {
  res.json(await contenidoService.obtener(req.params.clave as ClaveContenido));
};

export const guardar: RequestHandler = async (req, res) => {
  res.json(await contenidoService.guardar(req.params.clave as ClaveContenido, req.body, req.user!._id));
};
