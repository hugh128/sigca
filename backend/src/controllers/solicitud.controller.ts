import type { Request, RequestHandler } from "express";
import * as service from "../services/solicitud.service";
const actor = (req: Request) => ({ id: req.user!.id, rol: req.user!.rol });
export const crear: RequestHandler = async (req, res) => {
  await service.crear(req.body);
  res.status(201).json({ message: "Recibimos tu solicitud. El equipo te contactará para coordinar la cita; la fecha todavía no está reservada." });
};
export const listar: RequestHandler = async (req, res) => { res.json(await service.listar(req.query as unknown as Parameters<typeof service.listar>[0])); };
export const obtener: RequestHandler = async (req, res) => { res.json(await service.obtener(String(req.params.id))); };
export const convertir: RequestHandler = async (req, res) => { res.status(201).json(await service.convertir(String(req.params.id), req.body, actor(req))); };
export const rechazar: RequestHandler = async (req, res) => { res.json(await service.rechazar(String(req.params.id), req.body.motivo, actor(req))); };
