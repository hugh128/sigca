import type { RequestHandler } from "express";
import type { EstadoServicio } from "../models/Servicio";
import * as servicioService from "../services/servicio.service";

export const listar: RequestHandler = async (req, res) => {
  const filtros = req.query as { estado?: EstadoServicio; q?: string };
  res.json(await servicioService.listar(Boolean(req.user), filtros));
};

export const obtener: RequestHandler = async (req, res) => {
  res.json(await servicioService.obtener(String(req.params.id), Boolean(req.user)));
};

export const crear: RequestHandler = async (req, res) => {
  res.status(201).json(await servicioService.crear(req.body));
};

export const actualizar: RequestHandler = async (req, res) => {
  res.json(await servicioService.actualizar(String(req.params.id), req.body));
};

export const cambiarEstado: RequestHandler = async (req, res) => {
  res.json(await servicioService.cambiarEstado(String(req.params.id), req.body.estado));
};
