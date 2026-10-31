import type { Request, RequestHandler } from "express";
import * as service from "../services/caja.service";
const actor = (req: Request) => ({ id: req.user!.id, rol: req.user!.rol });
export const abrir: RequestHandler = async (req, res) => { res.status(201).json(await service.abrir(req.body.montoInicialCentavos, actor(req))); };
export const actual: RequestHandler = async (req, res) => { res.json(await service.actual(actor(req))); };
export const listar: RequestHandler = async (req, res) => { res.json(await service.listar(req.query as unknown as Parameters<typeof service.listar>[0], actor(req))); };
export const obtener: RequestHandler = async (req, res) => { res.json(await service.obtener(String(req.params.id), actor(req))); };
export const movimientos: RequestHandler = async (req, res) => { res.json(await service.movimientos(String(req.params.id), req.query as unknown as Parameters<typeof service.movimientos>[1], actor(req))); };
export const cerrar: RequestHandler = async (req, res) => { res.json(await service.cerrar(String(req.params.id), req.body.efectivoContadoCentavos, actor(req))); };
