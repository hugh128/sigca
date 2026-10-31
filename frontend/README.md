# SIGCA - Frontend

Portal público y sistema administrativo del **Sistema Integral de Gestión de Citas y Atención (SIGCA)**.
React 19 + TypeScript + Vite + Tailwind CSS 4.

> Estado: **Avance 1** completo en lo funcional: portal público, inicio de sesión, panel, administración de usuarios y servicios, y edición del contenido y los horarios del portal. Las imágenes se suben al backend (Cloudflare R2 o carpeta local).

## Requisitos

- Node.js 20 o superior
- El backend corriendo (ver `../backend/README.md`)

## Instalación

```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL apunta al backend
npm run dev              # http://localhost:5173
```

El backend debe tener `CLIENT_URL=http://localhost:5173` para que CORS permita las peticiones.

La API usa `http://localhost:4100/api`. Vite usa `5173` con `strictPort`: si el puerto esta ocupado, muestra un error en lugar de cambiar automaticamente a `5174`. Cierra la instancia anterior o configura explicitamente el puerto del frontend y el mismo origen en `CLIENT_URL` del backend; reinicia la API al cambiar esa variable.

## Solicitudes de cita

El portal incluye `/solicitar-cita`. Desde cada servicio se preselecciona su identificador en `?servicio=...`. TanStack Form/Zod valida nombre, correo, telefono, servicio activo, fecha preferida y mensaje opcional. La confirmacion aparece tras guardar y explica que todavia no se reserva un horario.

Administrador y recepcionista acceden a `/admin/solicitudes`: listado paginado por estado, detalle de contacto, rechazo con motivo opcional y conversion. Para convertir se elige expresamente un paciente registrado, profesional, fecha y horario libre mediante el formulario de citas. El servicio solicitado se conserva. Hay un enlace para registrar al paciente en otra pestana sin perder el formulario. Al guardar se abre el detalle de la cita; la solicitud atendida mantiene un enlace para consultarla despues. El calendario y la disponibilidad se actualizan. El profesional no tiene acceso a esta bandeja.

Las pruebas simulan tambien que el horario desaparece de disponibilidad tras reservarse, antes de terminar otras consultas: el formulario debe completar el guardado y abrir el detalle, sin quedar abierto ni permitir duplicar la conversion.

## Materiales

`/admin/materiales` ofrece catalogo, busqueda y paginacion. El administrador puede registrar, editar y cambiar el estado; el profesional consulta activos. Los formularios usan TanStack Form/Zod y restringen los enlaces a HTTP/HTTPS sin credenciales. Los recursos abren en otra pestana con `noopener noreferrer`.

Desde la ficha de un paciente (administrador) o desde **Mis pacientes** (profesional), el enlace Materiales abre `/admin/materiales/pacientes/:id`. Permite consultar asignaciones y elegir un recurso activo con busqueda/paginacion. El servidor verifica paciente activo, pertenencia y duplicados. El historial muestra fecha, usuario y estado del recurso, incluso tras desactivarlo. Recepcion no ve enlaces ni puede entrar por URL; la API tambien protege el acceso.

El contenido educativo del portal conserva su funcionamiento separado. El seed contiene recursos ficticios con enlaces ilustrativos; no se implementan subidas de PDF en esta entrega.

## Caja diaria

`/admin/caja`, para administrador y recepcionista, muestra la caja abierta propia o el formulario de apertura. El monto inicial se escribe en quetzales y se convierte a centavos con la utilidad existente, sin multiplicacion decimal de punto flotante. Permite cero; rechaza negativos, mas de dos decimales y valores fuera de rango. La confirmacion aparece tras guardar y el formulario desaparece al refrescar la caja actual. Si otra sesion ya abrio la caja, el conflicto 409 refresca y muestra la caja ganadora.

El listado es paginado, filtra por estado y permite ver detalle. Administrador consulta todas las cajas y puede marcar Solo mis cajas; recepcion solo recibe las propias desde la API. El profesional no ve el menu ni puede entrar por URL. Esta entrega muestra apertura y monto inicial; pagos, ingresos calculados y cierre siguen pendientes. El seed deja libre recepcion1 para probar la apertura y contiene una caja de recepcion2 para verificar la vista del administrador.

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verifica tipos y genera `dist/` |
| `npm run typecheck` | Solo verificación de tipos |
| `npm test` | Pruebas (Vitest + Testing Library) |
| `npm run test:contrato` | Pruebas de contrato contra el backend **real** (requiere el backend corriendo y `npm run seed`). Crean citas de prueba en fechas lejanas |

## Tecnologías (equivalencias con los lineamientos originales)

| Lineamiento | Este proyecto |
|---|---|
| Vue.js | React + TypeScript |
| Vue Router | React Router |
| Pinia | Zustand (sesión y avisos) |
| — | TanStack Query (datos del servidor) |
| — | TanStack Form + Zod (formularios y validación) |
| CSS | Tailwind CSS |

## Estructura

```
src/
  api/          consultas al backend (hooks de TanStack Query)
  components/   ui/ (botones, estados, avisos), forms/ (campos), public/, admin/
  config/       menú del sistema administrativo (qué módulos ve cada rol)
  layouts/      PublicLayout (portal) y AdminLayout (panel con menú lateral)
  lib/          cliente HTTP, formatos, utilidades
  pages/        public/ y admin/
  routes/       router y guards (RequireAuth, RequireRole, GuestOnly)
  schemas/      esquemas Zod de formularios
  store/        Zustand: auth (sesión) y toast (avisos)
  types/        tipos de las respuestas de la API
  test/         utilidades de prueba y fixtures (respuestas reales de la API)
```

## Módulos administrativos

El portal incluye `/contacto`: datos institucionales y formulario con TanStack Form/Zod, confirmacion tras guardar, bloqueo durante el envio y conservacion de los datos ante errores. Las peticiones de envio no llevan token, aunque exista una sesion del personal. Hay enlaces desde el menu publico y el pie de pagina.

| Ruta | Módulo | Roles | Qué permite |
|---|---|---|---|
| `/admin` | Panel | todos | Resumen |
| `/admin/mensajes` | Mensajes | Administrador | Consultar mensajes de contacto por fecha descendente, paginar y abrir el texto completo con correo y telefono |
| `/admin/usuarios` | Usuarios | Administrador | Crear, editar, buscar y filtrar; activar o desactivar; restablecer contraseña |
| `/admin/servicios` | Servicios | Administrador (gestiona), Recepcionista (consulta) | Crear, editar, activar o desactivar; precio en quetzales |
| `/admin/pacientes` | Pacientes | Administrador, Recepcionista | Listado con búsqueda (sin tildes), filtros por edad y estado, paginación y filtros guardados en la URL; registrar, editar, desactivar y reactivar. Muestra la edad al escribir la fecha de nacimiento |
| `/admin/pacientes/:id` | Ficha del paciente | Administrador, Recepcionista | Datos y responsables; asociar uno existente (buscador), registrar uno nuevo ya asociado o quitarlo. Alerta si un menor no tiene responsable (RN-04) |
| `/admin/responsables` | Responsables | Administrador, Recepcionista | Listado, registrar, editar y gestionar los pacientes de cada responsable |
| `/admin/calendario` | Calendario | Todos (el profesional ve solo su agenda) | Vista de mes, semana y día (FullCalendar) con las citas por color de estado, franjas de atención resaltadas, filtro por profesional y opción de ver canceladas. Clic en una cita abre su detalle; clic en un día (admin/recepción) abre «Programar cita» |
| `/admin/citas` | Citas | Todos (el profesional ve solo las suyas) | Listado por período, estado y profesional; historial de un paciente (`?paciente=`); confirmar desde la fila; detalle con historial y acciones según rol y estado |
| `/admin/mis-pacientes` | Mis pacientes | Profesional | Los pacientes que atiende, solo con información básica, con enlace a su historial de citas |
| `/admin/contenido` | Contenido del portal | Administrador | Editar las 6 secciones: General, Inicio (carrusel de 5 a 12 imágenes), Misión y visión, Contacto, Corporativo y Contenido educativo |
| `/admin/horarios` | Horarios de atención | Administrador y recepcionista | Administrador edita días/franjas con vista previa; recepción consulta sin controles de edición |

Patrones que los siguientes módulos reutilizan:
- **Listado + modal + confirmación:** `Usuarios.tsx` es el modelo (tabla, filtros, `Modal` basado en `<dialog>`, `ConfirmDialog`).
- **Errores del servidor en el formulario:** el envío se hace dentro de `validators.onSubmitAsync` y los errores de la API se muestran bajo el campo correspondiente con `erroresDeServidor()` (por ejemplo, un correo repetido aparece bajo «Correo electrónico»).
- **Formularios largos con listas** (carrusel, actividades, publicaciones, franjas): `FormularioSeccion` aporta la barra fija «Descartar / Guardar» (solo activa si hay cambios), `FilaLista` los botones de subir, bajar y quitar, y `AvisoSinGuardar` advierte antes de salir con cambios pendientes (enlaces, cambio de sección, recargar la página).
- **Imágenes:** `ControlImagen` (subir, cambiar, quitar, o pegar una dirección web) guarda la URL y la `key` del archivo en el formulario. Subir una imagen **no la publica**: se publica al guardar el formulario. Valida tipo y tamaño (5 MB) antes de enviar; el servidor lo vuelve a validar. Se usa en el logo, el carrusel, corporativo, publicaciones y servicios, y es el que usarán las fotos de pacientes y responsables.
- **Listados paginados con filtros en la URL:** `Pacientes.tsx` guarda búsqueda, filtros y página en la barra de direcciones (se pueden compartir y «volver» no los pierde). La búsqueda espera a que se termine de escribir (`useDebounce`) antes de consultar.
- **Asociar registros existentes:** `BuscadorAsociar` (buscar y elegir) sirve para responsable→paciente y paciente→responsable, y lo reutilizarán las citas.
- **Modales:** `Modal` distingue «la persona lo cerró» de «lo cerré por código»; así se puede pasar de una ventana a otra sin que la segunda se cierre sola.
- **Citas:** el formulario no deja «adivinar» una hora: pide al servidor los **horarios realmente libres** del profesional para ese servicio y fecha (`GET /citas/disponibilidad`) y los ofrece para elegir. `accionesDisponibles()` (`lib/citas.ts`) decide qué botones ve cada rol según el estado; es el espejo de las reglas del servidor y su coincidencia se verifica con la prueba de contrato.
- **Calendario:** amplía las horas visibles para incluir las franjas de atención y las citas del período, aunque estén fuera de 07:00–19:00. El profesional no consulta el listado de profesionales, reservado a administración y recepción.
- **Calendario:** las opciones de FullCalendar son constantes y los callbacks estables a propósito: si se recrearan en cada render, el calendario se reconfiguraría y avisaría el rango otra vez en un bucle infinito.
- **Errores del servidor:** `ApiError.errores` es solo la lista de errores por campo; otros datos llegan en `ApiError.detalles`.
- **Un solo origen para los valores iniciales:** `pages/admin/contenido/valores.ts` convierte lo que devuelve la API en los valores del formulario; la misma conversión usan los componentes y las pruebas.
- **Dinero:** el formulario trabaja con quetzales como texto y `lib/dinero.ts` convierte a **centavos enteros** sin usar decimales de punto flotante (`19.99` → `1999`).
- **Desactivar en lugar de eliminar:** conserva el historial (las citas y pagos futuros referencian usuarios y servicios).

## Cómo se maneja la sesión

- Al iniciar sesión se guarda el token en `localStorage` y el usuario en el store (Zustand).
- Al abrir la app, si hay token se verifica con `GET /auth/me` antes de decidir si mostrar el panel o el login.
- Si el servidor responde 401 a una petición autenticada (token vencido, usuario desactivado o contraseña restablecida), la sesión se cierra y los guards envían al login con un aviso.
- Un 403 (rol sin permiso) **no** cierra la sesión: solo se muestra "No tienes acceso".
- El portal público consulta la API **sin token**, así que siempre muestra la vista de visitante (servicios activos y sin precios) aunque haya alguien con sesión abierta en otra pestaña.
- Las rutas y menús se ocultan por rol para mejorar la experiencia, pero la autorización real está en el backend.

> Nota de seguridad: guardar el token en `localStorage` es práctico para un proyecto académico, pero queda expuesto si hubiera una vulnerabilidad XSS. En producción conviene una cookie `httpOnly`.

## Agregar un módulo administrativo

1. Crear la página en `src/pages/admin/`.
2. Registrar la ruta en `src/routes/router.tsx` (dentro de `AdminLayout`; envolver en `<RequireRole roles={[...]}>` si no es para todos los roles).
3. Agregarla a `src/config/adminNav.ts` con los roles que la ven.

## Formularios

Se usa TanStack Form con esquemas Zod. Ver `src/pages/admin/Login.tsx` como modelo y
`src/components/forms/TextField.tsx` para el campo reutilizable (muestra errores, `aria-invalid` y `aria-describedby`).

## Diseño

Tokens definidos en `src/index.css` (`@theme`): paleta `marea` (azul-verde), `sol` (acento amarillo), `ink`/`paper`/`bruma`.
Tipografías: **Lexend** (títulos e interfaz) y **Source Serif 4** (textos largos), instaladas con `@fontsource` (funcionan sin conexión).
Accesibilidad: enlace "Saltar al contenido", foco visible, carrusel con controles y sin movimiento automático si el sistema pide menos movimiento.
