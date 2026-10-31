import type { Rol } from "@/types/api";

export const ROL_ETIQUETA: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  RECEPCIONISTA: "Recepcionista",
  PROFESIONAL: "Profesional",
};

export const OPCIONES_ROL = (Object.keys(ROL_ETIQUETA) as Rol[]).map((valor) => ({ valor, etiqueta: ROL_ETIQUETA[valor] }));
