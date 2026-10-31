import type { RequestHandler } from "express";
import * as service from "../services/responsable.service";

const id = (req: Parameters<RequestHandler>[0]) => String(req.params.id);

export const listar: RequestHandler = async (req, res) => {
  res.json(await service.listar(req.query as unknown as { q?: string; page: number; limit: number }));
};
export const obtener: RequestHandler = async (req, res) => {
  res.json(await service.obtener(id(req)));
};
export const crear: RequestHandler = async (req, res) => {
  res.status(201).json(await service.crear(req.body));
};
export const actualizar: RequestHandler = async (req, res) => {
  res.json(await service.actualizar(id(req), req.body));
};
export const asociarPaciente: RequestHandler = async (req, res) => {
  res.json(await service.asociarPaciente(id(req), req.body.pacienteId));
};
export const desasociarPaciente: RequestHandler = async (req, res) => {
  res.json(await service.desasociarPaciente(id(req), String(req.params.pacienteId)));
};
