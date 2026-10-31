import type { Request, RequestHandler } from "express";
import * as service from "../services/cita.service";

const actor = (req: Request): service.Actor => ({ id: req.user!.id, rol: req.user!.rol });
const id = (req: Request) => String(req.params.id);

export const listar: RequestHandler = async (req, res) => {
  res.json(await service.listar(req.query as unknown as service.FiltrosCitas, actor(req)));
};
export const disponibilidad: RequestHandler = async (req, res) => {
  res.json(await service.disponibilidad(req.query as unknown as Parameters<typeof service.disponibilidad>[0]));
};
export const obtener: RequestHandler = async (req, res) => {
  res.json(await service.obtener(id(req), actor(req)));
};
export const crear: RequestHandler = async (req, res) => {
  res.status(201).json(await service.crear(req.body, actor(req)));
};
export const actualizar: RequestHandler = async (req, res) => {
  res.json(await service.actualizar(id(req), req.body, actor(req)));
};
export const cambiarEstado: RequestHandler = async (req, res) => {
  res.json(await service.cambiarEstado(id(req), req.body.estado, req.body.motivo, actor(req)));
};
