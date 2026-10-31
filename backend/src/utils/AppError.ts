/** Error controlado de la aplicacion: lleva el codigo HTTP que debe devolverse. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(msg: string, details?: unknown) { return new AppError(400, msg, details); }
  static unauthorized(msg = "No autenticado") { return new AppError(401, msg); }
  static forbidden(msg = "No tienes permisos para realizar esta acción") { return new AppError(403, msg); }
  static notFound(msg = "Recurso no encontrado") { return new AppError(404, msg); }
  static conflict(msg: string, details?: unknown) { return new AppError(409, msg, details); }
  static unprocessable(msg: string, details?: unknown) { return new AppError(422, msg, details); }
}
