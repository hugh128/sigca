import type { RequestHandler } from "express";
import * as authService from "../services/auth.service";

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  res.json(await authService.login(email, password));
};

export const me: RequestHandler = (req, res) => {
  res.json({ usuario: req.user });
};
