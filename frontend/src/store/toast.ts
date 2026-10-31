import { create } from "zustand";

export type TipoToast = "exito" | "error" | "info";

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ToastState {
  toasts: Toast[];
  agregar: (tipo: TipoToast, mensaje: string) => void;
  quitar: (id: number) => void;
}

let siguienteId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  agregar: (tipo, mensaje) => {
    const id = siguienteId++;
    set((s) => ({ toasts: [...s.toasts, { id, tipo, mensaje }] }));
    // Los errores permanecen mas tiempo para dar oportunidad de leerlos.
    setTimeout(() => get().quitar(id), tipo === "error" ? 8000 : 4500);
  },
  quitar: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Uso: toast.exito("Servicio guardado") — fuera de componentes tambien funciona. */
export const toast = {
  exito: (m: string) => useToastStore.getState().agregar("exito", m),
  error: (m: string) => useToastStore.getState().agregar("error", m),
  info: (m: string) => useToastStore.getState().agregar("info", m),
};
