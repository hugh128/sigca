import type { RequestHandler } from "express";
import * as horarioService from "../services/horario.service";

export const obtener: RequestHandler = async (_req, res) => {
  res.json(await horarioService.obtenerSemana());
};

export const guardar: RequestHandler = async (req, res) => {
  res.json(await horarioService.guardarSemana(req.body.dias));
};
