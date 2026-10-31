import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { login } from "@/api/auth";
import { useContenido } from "@/api/contenido";
import { TextField } from "@/components/forms/TextField";
import { ArcosDecorativos, Logo } from "@/components/public/Marca";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { loginSchema } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useContenido();
  const sesionExpirada = useAuthStore((s) => s.sesionExpirada);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const nombre = data?.general.nombreCentro ?? "SIGCA";
  useDocumentTitle("Iniciar sesión", nombre);

  const desde = (location.state as { desde?: string } | null)?.desde ?? "/admin";

  const form = useForm({
    defaultValues: { email: "", password: "" },
    // Se valida al salir de cada campo y al enviar; asi no se muestran errores mientras la persona aun escribe.
    validators: { onBlur: loginSchema, onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setErrorServidor(null);
      try {
        const usuario = await login(value.email.trim(), value.password);
        toast.exito(`Bienvenido, ${usuario.nombre.split(" ")[0]}`);
        navigate(desde, { replace: true });
      } catch (e) {
        setErrorServidor(e instanceof ApiError ? e.message : "No pudimos iniciar sesión. Inténtalo de nuevo.");
      }
    },
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-marea-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo nombre={nombre} logoUrl={data?.general.logoUrl} claro />
        <ArcosDecorativos className="pointer-events-none absolute -bottom-32 -right-32 size-[40rem] max-w-none opacity-50" />
        <p className="relative max-w-sm font-serif text-2xl leading-snug text-white">
          Gestión de citas, pacientes y pagos en un solo lugar.
        </p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo nombre={nombre} logoUrl={data?.general.logoUrl} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-marea-900">Iniciar sesión</h1>
          <p className="mt-2 text-ink-soft">Ingresa con tu cuenta del personal.</p>

          {sesionExpirada && !errorServidor && (
            <p role="status" className="mt-6 rounded-lg border-l-4 border-marea-500 bg-marea-50 px-4 py-3 text-sm">
              Tu sesión terminó. Inicia sesión de nuevo para continuar.
            </p>
          )}
          {errorServidor && (
            <p role="alert" className="mt-6 rounded-lg border-l-4 border-danger bg-danger-soft px-4 py-3 text-sm">
              {errorServidor}
            </p>
          )}

          <form
            noValidate
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field name="email">
              {(field) => <TextField field={field} label="Correo electrónico" type="email" autoComplete="username" autoFocus />}
            </form.Field>
            <form.Field name="password">
              {(field) => <TextField field={field} label="Contraseña" type="password" autoComplete="current-password" />}
            </form.Field>

            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(enviando) => (
                <Button type="submit" tamano="lg" className="w-full" disabled={enviando}>
                  {enviando && <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {enviando ? "Ingresando…" : "Iniciar sesión"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="mt-8 text-sm">
            <Link to="/" className="rounded text-marea-700 underline underline-offset-4 hover:text-marea-900">
              Volver al sitio del centro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
