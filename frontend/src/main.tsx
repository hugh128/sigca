import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { restaurarSesion } from "@/api/auth";
import { Toaster } from "@/components/ui/Toaster";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/routes/router";
import "./index.css";

/** Al abrir la app, si hay un token guardado se verifica con el servidor. */
function IniciarSesion({ children }: { children: ReactNode }) {
  useEffect(() => {
    void restaurarSesion();
  }, []);
  return children;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <IniciarSesion>
        <RouterProvider router={router} />
      </IniciarSesion>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
