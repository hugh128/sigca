import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { ControlImagen } from "@/components/forms/ControlImagen";
import { FilaLista } from "@/components/forms/FilaLista";
import { FormularioSeccion } from "@/components/forms/FormularioSeccion";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { mensajesDeError, TextField } from "@/components/forms/TextField";
import { comoFormConCampos } from "@/components/forms/tipos";
import { Button } from "@/components/ui/Button";
import { nuevoId } from "@/lib/id";
import { contactoSchema, corporativoSchema, educativoSchema, generalSchema, inicioSchema, misionVisionSchema } from "@/schemas/contenido";
import type { Contenido } from "@/types/api";
import { ListaImagenes } from "./ListaImagenes";
import { valoresContacto, valoresCorporativo, valoresEducativo, valoresGeneral, valoresInicio, valoresMisionVision } from "./valores";
import { useFormularioSeccion } from "./useFormularioSeccion";

export interface PropsSeccion<K extends keyof Contenido> {
  datos: Contenido[K];
  alCambiarSucio: (sucio: boolean) => void;
}

function Titulo({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-marea-900">{children}</h3>;
}

/* ---------------- General ---------------- */
export function SeccionGeneral({ datos, alCambiarSucio }: PropsSeccion<"general">) {
  const form = useFormularioSeccion("general", generalSchema, valoresGeneral(datos));
  return (
    <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio}>
      <form.Field name="nombreCentro">{(c) => <TextField field={c} label="Nombre del centro" ayuda="Aparece en el encabezado, el pie de página y el título de cada página." />}</form.Field>
      <form.Field name="eslogan">{(c) => <TextField field={c} label="Eslogan (opcional)" />}</form.Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">Logo (opcional)</p>
        <ControlImagen form={form} nombreUrl="logoUrl" nombreKey="logoKey" carpeta="general" etiqueta="Logo" />
        <p className="text-sm text-ink-soft">Si no subes un logo se usa el símbolo por defecto.</p>
      </div>
      <form.Field name="textoPiePagina">{(c) => <TextField field={c} label="Texto del pie de página" />}</form.Field>
      <form.Field name="notaHorarios">{(c) => <TextField field={c} label="Nota junto a los horarios" ayuda="Por ejemplo: «Atendemos con cita previa»." />}</form.Field>
    </FormularioSeccion>
  );
}

/* ---------------- Inicio ---------------- */
export function SeccionInicio({ datos, alCambiarSucio }: PropsSeccion<"inicio">) {
  const form = useFormularioSeccion("inicio", inicioSchema, valoresInicio(datos));
  return (
    <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio}>
      <form.Field name="titulo">{(c) => <TextField field={c} label="Título de la portada" />}</form.Field>
      <form.Field name="subtitulo">{(c) => <TextField field={c} label="Subtítulo (opcional)" />}</form.Field>
      <form.Field name="descripcion">{(c) => <TextAreaField field={c} label="Descripción (opcional)" rows={4} />}</form.Field>
      <ListaImagenes form={form} nombre="carrusel" titulo="Carrusel de la portada" carpeta="carrusel" maximo={12}
        ayuda="Entre 5 y 12 imágenes. Se muestran en este orden." />
    </FormularioSeccion>
  );
}

/* ---------------- Mision y vision ---------------- */
export function SeccionMisionVision({ datos, alCambiarSucio }: PropsSeccion<"misionVision">) {
  const form = useFormularioSeccion("misionVision", misionVisionSchema, valoresMisionVision(datos));
  return (
    <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio}>
      <form.Field name="mision">{(c) => <TextAreaField field={c} label="Misión" rows={6} />}</form.Field>
      <form.Field name="vision">{(c) => <TextAreaField field={c} label="Visión" rows={6} />}</form.Field>
    </FormularioSeccion>
  );
}

/* ---------------- Contacto ---------------- */
export function SeccionContacto({ datos, alCambiarSucio }: PropsSeccion<"contacto">) {
  const form = useFormularioSeccion("contacto", contactoSchema, valoresContacto(datos));
  return (
    <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio}>
      <form.Field name="direccion">{(c) => <TextField field={c} label="Dirección" />}</form.Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <form.Field name="telefono">{(c) => <TextField field={c} label="Teléfono" type="tel" />}</form.Field>
        <form.Field name="whatsapp">{(c) => <TextField field={c} label="WhatsApp (opcional)" type="tel" />}</form.Field>
      </div>
      <form.Field name="correo">{(c) => <TextField field={c} label="Correo electrónico" type="email" />}</form.Field>
      <form.Field name="facebook">{(c) => <TextField field={c} label="Facebook (opcional)" type="url" placeholder="https://facebook.com/…" />}</form.Field>
      <form.Field name="instagram">{(c) => <TextField field={c} label="Instagram (opcional)" type="url" placeholder="https://instagram.com/…" />}</form.Field>
      <form.Field name="mapaUrl">{(c) => <TextField field={c} label="Mapa (opcional)" type="url" placeholder="https://maps.google.com/…" ayuda="Dirección web del mapa con la ubicación del centro." />}</form.Field>
    </FormularioSeccion>
  );
}

/* ---------------- Corporativo ---------------- */
function BloqueCorporativo({ form, nombre, titulo }: { form: unknown; nombre: "capacitaciones" | "escuelaPadres"; titulo: string }) {
  const f = comoFormConCampos(form);
  return (
    <section className="space-y-5 rounded-2xl border border-marea-100 bg-marea-50/50 p-5">
      <h3 className="text-xl font-semibold text-marea-900">{titulo}</h3>
      <f.Field name={`${nombre}.descripcion`}>{(c) => <TextAreaField field={c} label="Descripción general" rows={4} />}</f.Field>

      <f.Field name={`${nombre}.actividades`} mode="array">
        {(lista) => {
          const items = (lista.state.value ?? []) as { id: string }[];
          const errores = mensajesDeError(lista);
          return (
            <fieldset className="space-y-3">
              <legend className="text-base font-semibold text-marea-900">Actividades</legend>
              {items.map((a, i) => (
                <FilaLista key={a.id} titulo={`${titulo}: actividad ${i + 1}`}
                  onSubir={i > 0 ? () => lista.moveValue(i, i - 1) : undefined}
                  onBajar={i < items.length - 1 ? () => lista.moveValue(i, i + 1) : undefined}
                  onQuitar={() => lista.removeValue(i)}>
                  <f.Field name={`${nombre}.actividades[${i}].titulo`}>{(c) => <TextField field={c} label="Título de la actividad" />}</f.Field>
                  <f.Field name={`${nombre}.actividades[${i}].descripcion`}>{(c) => <TextAreaField field={c} label="Descripción de la actividad" rows={3} />}</f.Field>
                </FilaLista>
              ))}
              {errores.length > 0 && <p role="alert" className="text-sm font-medium text-danger">{errores[0]}</p>}
              <Button variante="contorno" disabled={items.length >= 30} onClick={() => lista.pushValue({ id: nuevoId(), titulo: "", descripcion: "" })}>
                <Plus className="size-4" aria-hidden="true" />
                Agregar actividad
              </Button>
            </fieldset>
          );
        }}
      </f.Field>

      <ListaImagenes form={form} nombre={`${nombre}.imagenes`} titulo="Imágenes" carpeta="corporativo" etiquetaItem={`${titulo}: imagen`} maximo={12} />
    </section>
  );
}

export function SeccionCorporativo({ datos, alCambiarSucio }: PropsSeccion<"corporativo">) {
  const form = useFormularioSeccion("corporativo", corporativoSchema, valoresCorporativo(datos));
  return (
    <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio}>
      <BloqueCorporativo form={form} nombre="capacitaciones" titulo="Capacitaciones" />
      <BloqueCorporativo form={form} nombre="escuelaPadres" titulo="Escuela para padres" />
    </FormularioSeccion>
  );
}

/* ---------------- Contenido educativo ---------------- */
const hoyLocal = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD en la zona horaria de quien edita

export function SeccionEducativo({ datos, alCambiarSucio }: PropsSeccion<"educativo">) {
  const form = useFormularioSeccion("educativo", educativoSchema, valoresEducativo(datos));
  return (
    <FormularioSeccion form={form} alCambiarSucio={alCambiarSucio}>
      <form.Field name="publicaciones" mode="array">
        {(lista) => {
          const items = lista.state.value;
          const errores = mensajesDeError(lista);
          return (
            <fieldset className="space-y-3">
              <legend className="sr-only">Publicaciones</legend>
              <p className="text-sm text-ink-soft">En el portal se muestran de la más reciente a la más antigua, según su fecha de publicación.</p>
              {items.map((p, i) => (
                <FilaLista key={p.id} titulo={`Publicación ${i + 1}`} onQuitar={() => lista.removeValue(i)}>
                  <form.Field name={`publicaciones[${i}].titulo`}>{(c) => <TextField field={c} label="Título" />}</form.Field>
                  <form.Field name={`publicaciones[${i}].fechaPublicacion`}>{(c) => <TextField field={c} label="Fecha de publicación" type="date" className="sm:max-w-56" />}</form.Field>
                  <form.Field name={`publicaciones[${i}].descripcion`}>{(c) => <TextAreaField field={c} label="Contenido" rows={5} />}</form.Field>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-ink">Imagen (opcional)</p>
                    <ControlImagen form={form} nombreUrl={`publicaciones[${i}].imagenUrl`} nombreKey={`publicaciones[${i}].imagenKey`} carpeta="publicaciones" etiqueta={`Publicación ${i + 1}`} />
                  </div>
                  <form.Field name={`publicaciones[${i}].enlaceUrl`}>{(c) => <TextField field={c} label="Enlace para leer más (opcional)" type="url" placeholder="https://…" />}</form.Field>
                </FilaLista>
              ))}
              {items.length === 0 && <p className="rounded-lg bg-white p-4 text-ink-soft">Todavía no hay publicaciones.</p>}
              {errores.length > 0 && <p role="alert" className="text-sm font-medium text-danger">{errores[0]}</p>}
              <Button variante="contorno" onClick={() => lista.pushValue({ id: nuevoId(), titulo: "", descripcion: "", fechaPublicacion: hoyLocal(), imagenUrl: "", imagenKey: "", enlaceUrl: "" })}>
                <Plus className="size-4" aria-hidden="true" />
                Agregar publicación
              </Button>
            </fieldset>
          );
        }}
      </form.Field>
    </FormularioSeccion>
  );
}

export { Titulo };
