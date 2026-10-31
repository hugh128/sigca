# SIGCA - Backend (API REST)

API REST del **Sistema Integral de Gestion de Citas y Atencion (SIGCA)**.
Node.js + Express 5 + TypeScript + MongoDB (Mongoose).

> Estado: **Avance 1 + Avance 2 (en curso: pacientes y responsables)**. Avance 1: (configuracion, autenticacion, usuarios, servicios, contenido institucional, horarios e imagenes en Cloudflare R2).

## Requisitos

- Node.js 20 o superior
- MongoDB (local o MongoDB Atlas)

## Instalacion

```bash
cd backend
npm install
cp .env.example .env     # luego edita los valores (ver abajo)
npm run seed             # carga datos de prueba (BORRA usuarios y servicios)
npm run dev              # API en http://localhost:4000/api
```

## Variables de entorno

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `4000` |
| `CLIENT_URL` | Origen del frontend permitido por CORS | `http://localhost:5173` |
| `MONGODB_URI` | Cadena de conexion | `mongodb://127.0.0.1:27017/sigca` |
| `JWT_SECRET` | Secreto para firmar tokens (min. 32 caracteres) | ver `.env.example` |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` |
| `STORAGE_DRIVER` | Donde se guardan las imagenes: `local` (carpeta `uploads/`) o `r2` (Cloudflare R2) | `local` |
| `API_PUBLIC_URL` | URL publica de esta API (solo modo local) | `http://localhost:4000` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Credenciales y URL publica del bucket. Obligatorias solo con `STORAGE_DRIVER=r2` | ver seccion R2 |

La aplicacion valida las variables al arrancar y se detiene con un mensaje claro si falta alguna.

## Scripts

| Comando | Accion |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con recarga |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run seed` | Carga datos de prueba ficticios |
| `npm run test:r2` | Prueba el driver de R2 contra un servidor S3 simulado (no necesita credenciales ni internet) |
| `npm run storage:probar` | Verifica TU configuracion de almacenamiento: sube una imagen de prueba, la descarga y la borra |
| `node scripts/smoke-test.mjs` | Pruebas de extremo a extremo (requiere API corriendo y `npm run seed` recien ejecutado) |

## Credenciales de demostracion

Contrasena de todos los usuarios: `Sigca2026!`

| Rol | Correo |
|---|---|
| ADMINISTRADOR | admin@sigca.test |
| RECEPCIONISTA | recepcion1@sigca.test, recepcion2@sigca.test |
| PROFESIONAL | profesional1@sigca.test, profesional2@sigca.test, profesional3@sigca.test |

## Convenciones de la API

- **Dinero en centavos enteros** (RN-28): Q250.00 se envia y se guarda como `25000`.
- Los modelos se devuelven con `id` (no `_id`) y sin `__v`.
- **Errores** con formato uniforme: `{ "message": "...", "errors": [{ "campo": "...", "mensaje": "..." }] }`
  - `400` datos invalidos · `401` no autenticado · `403` sin permiso · `404` no existe · `409` conflicto (duplicado) · `422` regla de negocio incumplida · `429` demasiadas peticiones · `500` error interno
- **Autenticacion:** `Authorization: Bearer <token>`.
- Los permisos se verifican en el backend (middleware `authorize`).

## Endpoints del Avance 1

### Autenticacion
| Metodo | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Publico (limitado a 10 intentos fallidos / 15 min) |
| GET | `/api/auth/me` | Autenticado |

### Usuarios
| Metodo | Ruta | Acceso |
|---|---|---|
| GET | `/api/usuarios?rol=&activo=&q=` | ADMINISTRADOR |
| GET | `/api/usuarios/profesionales` | ADMINISTRADOR, RECEPCIONISTA |
| GET | `/api/usuarios/:id` | ADMINISTRADOR |
| POST | `/api/usuarios` | ADMINISTRADOR |
| PUT | `/api/usuarios/:id` | ADMINISTRADOR |
| PATCH | `/api/usuarios/:id/estado` | ADMINISTRADOR |
| PATCH | `/api/usuarios/:id/password` | ADMINISTRADOR (restablece y cierra sesiones anteriores) |

### Servicios
| Metodo | Ruta | Acceso |
|---|---|---|
| GET | `/api/servicios?estado=&q=` | Publico: solo ACTIVOS y sin precio. Con sesion: todos, con precio |
| GET | `/api/servicios/:id` | Igual que el listado |
| POST | `/api/servicios` | ADMINISTRADOR |
| PUT | `/api/servicios/:id` | ADMINISTRADOR |
| PATCH | `/api/servicios/:id/estado` | ADMINISTRADOR |

### Contenido institucional (portal publico editable)
| Metodo | Ruta | Acceso |
|---|---|---|
| GET | `/api/contenido` | Publico. Devuelve las 6 secciones en un solo objeto |
| GET | `/api/contenido/:clave` | Publico |
| PUT | `/api/contenido/:clave` | ADMINISTRADOR (reemplaza la seccion completa) |

Secciones (`clave`): `general` (nombre del centro, logo, pie de pagina, nota de horarios), `inicio` (titulo, subtitulo, descripcion y carrusel de **minimo 5 imagenes**), `misionVision`, `contacto`, `corporativo` (capacitaciones y escuela para padres) y `educativo` (publicaciones, devueltas de la mas reciente a la mas antigua).

- Los elementos de listas (imagenes, actividades, publicaciones) reciben un `id` automatico si no lo traen.
- Si una seccion aun no se ha guardado, la API devuelve un contenido por defecto para que el portal nunca quede vacio.
- Los cambios se guardan en MongoDB y se ven de inmediato en el portal, sin tocar codigo (RF-12).

### Horarios de atencion
| Metodo | Ruta | Acceso |
|---|---|---|
| GET | `/api/horarios` | Publico. Siempre devuelve los 7 dias en orden |
| PUT | `/api/horarios` | ADMINISTRADOR. Recibe `{ dias: [7 elementos] }` |

Cada dia: `{ dia, atiende, franjas: [{ inicio: "HH:mm", fin: "HH:mm" }] }`. Un dia puede tener varias franjas (p. ej. manana y tarde). Se valida: formato `HH:mm`, inicio < fin, sin traslapes, y que un dia con atencion tenga al menos una franja. Estos horarios se usaran para validar las citas (RN-02).

### Pacientes y responsables (ADMINISTRADOR y RECEPCIONISTA)
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/pacientes?q=&estado=&menores=&page=&limit=` | Listado paginado. `q` busca por nombre, apellido o telefono **sin importar tildes**. `menores=true/false` filtra por edad |
| GET | `/api/pacientes/:id` | Detalle con sus responsables completos |
| POST | `/api/pacientes` | Crear (acepta `responsables: [ids]` para asociar al crear) |
| PUT | `/api/pacientes/:id` | Actualizar (parcial) |
| PATCH | `/api/pacientes/:id/estado` | `ACTIVO` / `INACTIVO` (eliminacion logica) |
| POST | `/api/pacientes/:id/responsables` | Asociar un responsable `{ responsableId }` |
| DELETE | `/api/pacientes/:id/responsables/:responsableId` | Quitar la asociacion |
| GET | `/api/responsables?q=&page=&limit=` | Listado paginado, cada uno con sus pacientes |
| GET | `/api/responsables/:id` | Detalle con sus pacientes |
| POST | `/api/responsables` | Crear (acepta `pacientes: [ids]`) |
| PUT | `/api/responsables/:id` | Actualizar (parcial) |
| POST | `/api/responsables/:id/pacientes` | Asociar un paciente `{ pacienteId }` |
| DELETE | `/api/responsables/:id/pacientes/:pacienteId` | Quitar la asociacion |

Las listas devuelven `{ items, total, page, limit, pages }` (maximo 100 por pagina).

Decisiones de diseno:
- **La edad no se guarda: se calcula** al responder (`edad` y `esMenor`), con la fecha de hoy en **America/Guatemala**. Quien cumple 18 hoy ya no es menor; quien los cumple manana todavia lo es. El filtro `menores` usa la misma regla.
- Las fechas de nacimiento y de inicio son **fechas de calendario** (`AAAA-MM-DD`, sin hora), asi no se "corren" un dia por la zona horaria.
- **La relacion paciente-responsable se guarda en un solo lugar** (`Paciente.responsables`); los pacientes de un responsable se obtienen consultando esa coleccion. No hay dos copias que desincronizar.
- **No existe DELETE** de pacientes ni de responsables: los pacientes se desactivan y conservan su historial. Un `PUT` nunca cambia el estado.
- Los menores de edad pueden registrarse sin responsable (el sistema lo senala), pero **no podran agendar citas hasta tener uno** (RN-04, se aplica en el modulo de citas).
- La busqueda usa campos normalizados internos (`busqueda`, `orden`) que no se exponen en la API; los caracteres de expresion regular se buscan como texto.

### Imagenes
| Metodo | Ruta | Acceso |
|---|---|---|
| POST | `/api/uploads` | ADMINISTRADOR, RECEPCIONISTA (limitado a 60 subidas / 15 min) |

Se envia como `multipart/form-data` con el campo `carpeta` (antes del archivo) y el archivo en el campo **`archivo`**.
Carpetas permitidas: `general` (logo), `carrusel`, `servicios`, `corporativo`, `publicaciones`, `pacientes`, `responsables`, `materiales`.
Responde `201` con `{ url, key, ancho, alto, bytes }`. **En la base de datos solo se guarda la `url` y la `key`**, nunca la imagen.

Que hace el servidor con cada archivo:
- Lo **decodifica de verdad** (no confia en el nombre ni en el tipo que declara el navegador): un texto renombrado a `.png` se rechaza (`422`).
- Acepta JPG, PNG, WebP y GIF. **SVG no** (puede contener scripts).
- Maximo **5 MB** (`413`) y **40 millones de pixeles** (proteccion contra imagenes "bomba").
- Aplica la orientacion EXIF, **elimina los metadatos** (ubicacion GPS, modelo de camara; importante en fotos de pacientes), reduce a un maximo de **1600 px** y la guarda como **WebP** con nombre aleatorio (`carpeta/anio/uuid.webp`).

## Cloudflare R2

El almacenamiento es intercambiable con `STORAGE_DRIVER`:

- **`local`** (por defecto): guarda en `uploads/` y la API las sirve en `/uploads/...`. No requiere ninguna cuenta: cualquiera puede clonar el proyecto y correrlo.
- **`r2`**: guarda en tu bucket de Cloudflare R2.

Configuracion paso a paso:

1. En el panel de Cloudflare: **R2 Object Storage → Create bucket** (por ejemplo `sigca-imagenes`).
2. Dentro del bucket: **Settings → Public access**. Para desarrollo activa el **R2.dev subdomain**; para produccion conecta un **dominio propio** (las URL `r2.dev` tienen limites y no se recomiendan en produccion). Copia la URL publica: es `R2_PUBLIC_URL`.
3. En **R2 → Manage API tokens → Create API token**: permiso **Object Read & Write**, limitado a ese bucket. Copia el *Access Key ID* y el *Secret Access Key* (solo se muestran una vez). El *Account ID* aparece en la pagina principal de R2.
4. En `.env`:
   ```
   STORAGE_DRIVER=r2
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=sigca-imagenes
   R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
   ```
5. Verifica: `npm run storage:probar`. Sube una imagen de prueba, comprueba que su URL publica responde y la borra. Si algo falla, el mensaje indica que revisar.

Notas importantes:
- **Nunca subas el `.env` a GitHub** (ya esta en `.gitignore`). Si una llave se filtra, revocala y crea otra en Cloudflare.
- **No hace falta configurar CORS en el bucket**: el navegador sube las imagenes a esta API, y es la API la que las envia a R2.
- Las imagenes de un bucket con acceso publico son accesibles por cualquiera que tenga la URL (los nombres son UUID aleatorios, pero la URL no es secreta). Para fotos de pacientes en un entorno real conviene un bucket privado con URL firmadas.
- Si se reemplaza una imagen, el archivo anterior queda en el bucket (`key` guardada en la base de datos permite limpiarlo despues).

## Seguridad implementada

- Contrasenas con **bcrypt** (costo 12); nunca se devuelven hashes en la API.
- **JWT** + verificacion del usuario en BD en cada peticion: un usuario desactivado pierde acceso de inmediato (RN-08).
- Restablecer contrasena invalida los tokens emitidos antes del cambio.
- Mensaje unico de "Credenciales invalidas" y comparacion de hash siempre, para no revelar si un correo existe.
- Validacion de entradas con **Zod** (tambien frena objetos tipo `{ "$gt": "" }` en el login).
- `helmet`, CORS restringido, limite de tamano de body, rate limiting.
- Manejo centralizado de errores (sin detalles internos en produccion).

## Estructura

```
src/
  config/        env (validado con Zod) y conexion a MongoDB
  models/        esquemas Mongoose (usuarios, servicios, contenidoInstitucional, horarios)
  schemas/       validaciones Zod de entrada
  middlewares/   auth, validate, errorHandler, rateLimit
  services/      reglas de negocio
  controllers/   capa HTTP (delgada)
  routes/        definicion de rutas y permisos
  storage/       almacenamiento de archivos: local y Cloudflare R2
  scripts/       verificaciones del almacenamiento
  seed/          datos de prueba
```
