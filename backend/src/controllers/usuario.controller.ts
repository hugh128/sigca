import type { RequestHandler } from "express";
import * as usuarioService from "../services/usuario.service";

export const listar: RequestHandler = async (req, res) => {
  res.json(await usuarioService.listar(req.query as usuarioService.FiltrosUsuarios));
};

export const listarProfesionales: RequestHandler = async (_req, res) => {
  res.json(await usuarioService.listarProfesionalesActivos());
};

export const obtener: RequestHandler = async (req, res) => {
  res.json(await usuarioService.obtener(String(req.params.id)));
};

export const crear: RequestHandler = async (req, res) => {
  res.status(201).json(await usuarioService.crear(req.body));
};

export const actualizar: RequestHandler = async (req, res) => {
  res.json(await usuarioService.actualizar(String(req.params.id), req.body, req.user!));
};

export const cambiarEstado: RequestHandler = async (req, res) => {
  res.json(await usuarioService.actualizar(String(req.params.id), { activo: req.body.activo }, req.user!));
};

export const restablecerPassword: RequestHandler = async (req, res) => {
  await usuarioService.restablecerPassword(String(req.params.id), req.body.password);
  res.json({ message: "Contraseña restablecida. Las sesiones anteriores de ese usuario ya no son válidas" });
};
