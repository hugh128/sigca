import type { Request, RequestHandler } from "express";
import * as service from "../services/material.service";
const actor = (req: Request) => ({ id: req.user!.id, rol: req.user!.rol });
export const listar: RequestHandler = async (req, res) => { res.json(await service.listar(req.query as unknown as Parameters<typeof service.listar>[0], actor(req))); };
export const obtener: RequestHandler = async (req, res) => { res.json(await service.obtener(String(req.params.id), actor(req))); };
export const crear: RequestHandler = async (req, res) => { res.status(201).json(await service.crear(req.body)); };
export const actualizar: RequestHandler = async (req, res) => { res.json(await service.actualizar(String(req.params.id), req.body)); };
export const asignaciones: RequestHandler = async (req, res) => { res.json(await service.asignaciones(String(req.params.id), req.query as unknown as Parameters<typeof service.asignaciones>[1], actor(req))); };
export const asignar: RequestHandler = async (req, res) => { res.status(201).json(await service.asignar(String(req.params.id), req.body.materialId, actor(req))); };
