import bcrypt from "bcryptjs";

const COSTO = 12;

export function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, COSTO);
}

export function compararPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}

/** Hash de relleno para comparar aunque el usuario no exista (evita revelar correos por tiempos de respuesta). */
export const HASH_FALSO = bcrypt.hashSync("relleno-para-igualar-tiempos", COSTO);
