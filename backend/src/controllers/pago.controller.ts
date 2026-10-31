import type { RequestHandler } from "express";
import * as service from "../services/pago.service";
export const crear: RequestHandler = async (req, res) => { res.status(201).json(await service.crear(req.body, { id: req.user!.id, rol: req.user!.rol })); };
export const listar: RequestHandler = async (req, res) => { res.json(await service.listar(req.query as unknown as Parameters<typeof service.listar>[0])); };
export const resumen: RequestHandler = async (req, res) => { res.json(await service.resumen(String(req.params.id))); };
