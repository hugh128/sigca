import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import { useHorarios } from "@/api/horarios";
import { resumirHorarios } from "@/lib/horarios";
import type { Contenido } from "@/types/api";
import { textoFranjas } from "./ListaHorarios";
import { Logo } from "./Marca";

export function PublicFooter({ contenido }: { contenido: Pick<Contenido, "general" | "contacto"> }) {
  const { general, contacto } = contenido;
  const { data: horarios } = useHorarios();
  const grupos = horarios ? resumirHorarios(horarios.dias) : [];

  return (
    <footer className="bg-marea-900 text-white/85">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Logo nombre={general.nombreCentro} logoUrl={general.logoUrl} claro />
          {general.eslogan && <p className="mt-4 max-w-xs font-serif leading-relaxed">{general.eslogan}</p>}
        </div>

        <div>
          <h2 className="font-medium text-white">Contacto</h2>
          <Link to="/contacto" className="mt-3 inline-block rounded text-sm text-white underline underline-offset-4">Escríbenos</Link>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-sol-400" aria-hidden="true" />
              <span>{contacto.direccion}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-sol-400" aria-hidden="true" />
              <a href={`tel:${contacto.telefono.replace(/\s/g, "")}`} className="hover:text-white hover:underline">{contacto.telefono}</a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-sol-400" aria-hidden="true" />
              <a href={`mailto:${contacto.correo}`} className="hover:text-white hover:underline">{contacto.correo}</a>
            </li>
          </ul>
          {(contacto.facebook || contacto.instagram) && (
            <p className="mt-4 flex gap-4 text-sm">
              {contacto.facebook && (
                <a href={contacto.facebook} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">
                  Facebook
                </a>
              )}
              {contacto.instagram && (
                <a href={contacto.instagram} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">
                  Instagram
                </a>
              )}
            </p>
          )}
        </div>

        <div>
          <h2 className="font-medium text-white">Horarios</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {grupos.map((g) => (
              <li key={g.dias.join("-")}>
                <span className="text-white">{g.etiqueta}: </span>
                {g.atiende ? textoFranjas(g.franjas) : "Sin atención"}
              </li>
            ))}
          </ul>
          {general.notaHorarios && <p className="mt-3 text-sm">{general.notaHorarios}</p>}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm sm:px-6">
          <p>{general.textoPiePagina}</p>
          <Link to="/admin" className="rounded-md hover:text-white hover:underline">Acceso del personal</Link>
        </div>
      </div>
    </footer>
  );
}
