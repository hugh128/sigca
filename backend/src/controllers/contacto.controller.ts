import type { RequestHandler } from "express";
import * as service from "../services/contacto.service";

export const crear: RequestHandler = async (req, res) => {
  await service.crear(req.body);
  res.status(201).json({ message: "Recibimos tu mensaje. El equipo se pondrá en contacto contigo." });
};
export const listar: RequestHandler = async (req, res) => {
  res.json(await service.listar(req.query as unknown as Parameters<typeof service.listar>[0]));
};
