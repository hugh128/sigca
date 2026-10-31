import type { RequestHandler } from "express";
import * as service from "../services/paciente.service";

const id = (req: Parameters<RequestHandler>[0]) => String(req.params.id);

export const listar: RequestHandler = async (req, res) => {
  res.json(await service.listar(req.query as unknown as service.FiltrosPacientes));
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
export const cambiarEstado: RequestHandler = async (req, res) => {
  res.json(await service.cambiarEstado(id(req), req.body.estado));
};
export const asociarResponsable: RequestHandler = async (req, res) => {
  res.json(await service.asociarResponsable(id(req), req.body.responsableId));
};
export const desasociarResponsable: RequestHandler = async (req, res) => {
  res.json(await service.desasociarResponsable(id(req), String(req.params.responsableId)));
};
