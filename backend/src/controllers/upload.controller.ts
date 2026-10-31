import type { RequestHandler } from "express";
import * as imagenService from "../services/imagen.service";
import { AppError } from "../utils/AppError";

export const subir: RequestHandler = async (req, res) => {
  if (!req.file) throw AppError.badRequest("Adjunta una imagen en el campo «archivo»");
  res.status(201).json(await imagenService.subirImagen(req.file.buffer, req.body.carpeta));
};
