# SIGCA - Backend (API REST)

API REST del **Sistema Integral de Gestion de Citas y Atencion (SIGCA)**.
Node.js + Express 5 + TypeScript + MongoDB (Mongoose).

> Estado: **Avance 1 + módulos del Avance 2**: pacientes, responsables, citas/calendario, contacto, solicitudes y materiales/asignaciones. Pendientes revision de cierre operativo y finanzas.

## Requisitos

- Node.js 20 o superior
- MongoDB Server local (Compass es opcional). La instancia del proyecto usa un replica set de un nodo para desarrollo, independiente del servicio de Windows.

## Instalacion

```bash
cd backend
npm install
cp .env.example .env     # luego edita los valores (ver abajo)
npm run db:start         # replica set local en puerto 27018
npm run seed             # recrea las colecciones de prueba, incluidos los mensajes
npm run dev              # API en http://localhost:4100/api
```

## Variables de entorno

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `4100` |
| `CLIENT_URL` | Origen del frontend permitido por CORS | `http://localhost:5173` |
| `MONGODB_URI` | Cadena de conexion | `mongodb://localhost:27018/sigca?replicaSet=sigca-rs` |
| `JWT_SECRET` | Secreto para firmar tokens (min. 32 caracteres) | ver `.env.example` |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` |
| `STORAGE_DRIVER` | Donde se guardan las imagenes: `local` (carpeta `uploads/`) o `r2` (Cloudflare R2) | `local` |
| `API_PUBLIC_URL` | URL publica de esta API (solo modo local) | `http://localhost:4100` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Credenciales y URL publica del bucket. Obligatorias solo con `STORAGE_DRIVER=r2` | ver seccion R2 |

La aplicacion valida las variables al arrancar y se detiene con un mensaje claro si falta alguna.

## MongoDB local y Compass

Instala MongoDB Server y ejecuta `npm run db:start` desde `backend/`. En Windows se busca `mongod.exe` en las versiones instaladas bajo `Program Files/MongoDB/Server`; en otros sistemas se usa `mongod` del PATH. Puedes indicar una ruta diferente con `MONGOD_PATH` en `.env`.

La instancia de SIGCA usa `localhost:27018` y el replica set `sigca-rs`. Solo escucha en la interfaz local. Es un nodo para desarrollo, sin redundancia ni autenticacion de base de datos; no debe exponerse a Internet. El servicio habitual de Windows en `27017` conserva su configuracion y sus bases.

Conexion para `.env` y para **Compass → Add new connection**:

```text
mongodb://localhost:27018/sigca?replicaSet=sigca-rs
```

Los datos, logs y respaldos se guardan en `.local/mongodb/` en la raiz del repositorio, excluida de Git. No borres esa carpeta para actualizar el codigo. Despues de reiniciar Windows, ejecuta `npm run db:start` antes de iniciar la API; `db:status` confirma que el miembro esta en estado `PRIMARY`. `db:stop` realiza un apagado normal de esa instancia; verifica su directorio de datos antes de apagar y no toca el servicio de Windows.

### Copiar una base local existente (una sola vez)

Con la API detenida y `.env` todavia apuntando a `mongodb://127.0.0.1:27017/sigca`, ejecuta `npm run db:migrate`. El comando crea un respaldo Extended JSON con tipos BSON, verifica su lectura y copia documentos e indices al destino **solo si esta vacio**. No borra ni sobrescribe el origen; falla si encuentra colecciones en el destino.

Tras una copia correcta, cambia `MONGODB_URI` a la conexion de `27018` y reinicia la API. No ejecutes `seed` para migrar: recrea datos de demostracion. El respaldo EJSON del comando cubre las colecciones ordinarias de SIGCA; no es un respaldo completo del servidor ni sustituye `mongodump` para administracion general.

Para volver al estado anterior, detiene la API, restaura su URI de `27017` y reiniciala. La base original permanece disponible; las escrituras realizadas despues del cambio a `27018` no se transfieren automaticamente al origen. Los datos y respaldos quedan conservados al ejecutar `db:stop`.

Guia oficial: [convertir a replica set](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/) y [configuracion para desarrollo](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-for-testing/).

## Scripts

| Comando | Accion |
|---|---|
| `npm run db:start` | Inicia MongoDB local, inicializa el replica set una sola vez y espera al primario; repetirlo no borra datos |
| `npm run db:status` | Muestra el estado de la instancia de SIGCA |
| `npm run db:stop` | Apaga solo la instancia local del proyecto |
| `npm run db:migrate` | Respalda y copia SIGCA desde 27017 a un destino vacio en 27018; usar solo con la conexion antigua en `.env` |
| `npm run dev` | Servidor en modo desarrollo con recarga |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm test` | Regresiones de citas y transacciones (commit, rollback y concurrencia) con MongoDB real en bases temporales independientes |
| `npm run test:e2e` | Compila y ejecuta pruebas HTTP y contratos del frontend en una base temporal (requiere MongoDB local y dependencias del frontend) |
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

### Contacto

| Metodo | Ruta | Acceso |
|---|---|---|
| POST | `/api/contacto` | Publico, hasta 20 envios por IP por hora |
| GET | `/api/contacto?page=&limit=` | Solo ADMINISTRADOR; orden mas reciente primero |

El POST recibe `{ nombre, correo, telefono, asunto, mensaje }`. Todos son obligatorios: nombre 2–120 caracteres, correo valido hasta 254, telefono valido hasta 20, asunto 3–150 y mensaje 10–3000. El servidor normaliza correo y espacios, asigna `fecha` y descarta campos adicionales. Responde `201` con una confirmacion, sin devolver los datos personales ni el identificador del mensaje. No envia correo electronico.

El listado devuelve `{ items, total, page, limit, pages }`, con un maximo de 100 mensajes por pagina. Cada mensaje incluye `id`, los cinco campos y `fecha`. No hay lectura publica, edicion ni eliminacion por API. Recepcion y profesionales reciben `403`; sin sesion, `401`.

Los errores de entrada usan `400` y la estructura habitual por campo. El POST no admite claves de idempotencia: no reintentar automaticamente tras un fallo de red, porque el mensaje podria haberse guardado. La interfaz bloquea el boton mientras envia y conserva los datos ante errores.

El seed incluye tres mensajes ficticios. `tests/contacto.test.ts` verifica persistencia, normalizacion, permisos, paginacion, fecha y limites de envio sobre una base temporal. El verificador HTTP incluye el flujo publico a bandeja administrativa.

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

Las pruebas `npm test` y `npm run test:e2e` crean bases con prefijo `sigca_test_` y nombre aleatorio; no ejecutan el seed sobre la base de desarrollo y eliminan su base al terminar normalmente.

Decisiones de diseno:
- **La edad no se guarda: se calcula** al responder (`edad` y `esMenor`), con la fecha de hoy en **America/Guatemala**. Quien cumple 18 hoy ya no es menor; quien los cumple manana todavia lo es. El filtro `menores` usa la misma regla.
- Las fechas de nacimiento y de inicio son **fechas de calendario** (`AAAA-MM-DD`, sin hora), asi no se "corren" un dia por la zona horaria.
- **La relacion paciente-responsable se guarda en un solo lugar** (`Paciente.responsables`); los pacientes de un responsable se obtienen consultando esa coleccion. No hay dos copias que desincronizar.
- **No existe DELETE** de pacientes ni de responsables: los pacientes se desactivan y conservan su historial. Un `PUT` nunca cambia el estado.
- Los menores de edad pueden registrarse sin responsable (el sistema lo senala), pero **no podran agendar citas hasta tener uno** (RN-04, se aplica en el modulo de citas).
- La busqueda usa campos normalizados internos (`busqueda`, `orden`) que no se exponen en la API; los caracteres de expresion regular se buscan como texto.

### Citas
| Metodo | Ruta | Acceso |
|---|---|---|
| GET | `/api/citas?desde=&hasta=&estado=&profesionalId=&pacienteId=&servicioId=&orden=&page=&limit=` | Admin y recepcion: todas. **Profesional: solo las suyas** |
| GET | `/api/citas/disponibilidad?profesionalId=&servicioId=&fecha=&excluirCitaId=` | Admin y recepcion |
| GET | `/api/citas/:id` | Igual que el listado (con historial) |
| POST | `/api/citas` | Admin y recepcion |
| PUT | `/api/citas/:id` | Admin y recepcion (reprogramar / editar observaciones) |
| PATCH | `/api/citas/:id/estado` | Segun el rol (ver abajo) |

Crear: `{ pacienteId, servicioId, profesionalId, fecha: "AAAA-MM-DD", horaInicio: "HH:mm", observaciones? }` — la fecha y la hora son **de Guatemala** (UTC-6, sin horario de verano). La hora de fin la calcula el servidor con la duracion del servicio. Las respuestas traen `fecha`, `horaInicio` y `horaFin` ya en hora de Guatemala, mas `inicio` y `fin` como instantes UTC.

Al reprogramar, la disponibilidad usa la duracion guardada en la cita indicada por `excluirCitaId`; el servicio debe coincidir con el de esa cita. Se conservan duracion y precio aunque el servicio cambie o se desactive (no puede elegirse para citas nuevas). Se vuelven a validar el paciente activo, el responsable del menor y el profesional activo.

**Reglas de negocio** (todas en `services/cita.service.ts`):

| Regla | Que hace el sistema |
|---|---|
| RN-01 | Un profesional no puede tener dos citas pendientes/confirmadas que se traslapen (`409` con el horario del choque en `detalles`). Dos citas **pegadas** (una termina cuando la otra empieza) no se traslapan |
| RN-02 | La cita debe caber **entera** dentro de una franja del horario de atencion de ese dia (no cruza el receso ni el cierre) |
| RN-03 / RN-14 | Paciente, servicio y profesional deben estar activos |
| RN-04 | Un menor de edad sin responsable no puede tener citas |
| RN-05 / RN-06 | Una cita cancelada no pasa a completada; una completada no se reprograma ni cambia de estado |
| RN-07 | Un servicio inactivo no se puede elegir |
| RN-11 | No se programa ni reprograma en fechas u horas pasadas |
| RN-12 / RF-07 | La duracion y el **precio se copian** del servicio al programar: si el servicio cambia despues, la cita conserva los suyos |
| RN-13 | Las citas canceladas y completadas no bloquean horarios |

**Estados:** `PENDIENTE → CONFIRMADA → COMPLETADA`; se puede cancelar desde pendiente o confirmada. `CANCELADA` y `COMPLETADA` son finales (mas estricto que la RN-05). Quien puede asignar cada estado: recepcion confirma y cancela; el **profesional solo completa sus propias citas** (y no ve precios); el administrador puede todo. Cada cambio queda en `historial` con quien lo hizo.

**Integridad con otros modulos:** no se puede desactivar a un paciente o profesional con citas pendientes o confirmadas, ni quitar al unico responsable de un menor que tiene citas.

**Concurrencia:** dos peticiones simultaneas para el mismo horario no pueden crear ambas la cita: se serializan por profesional (`utils/bloqueo.ts`) y solo una gana (la otra recibe `409`). Esto protege dentro de una instancia del servidor; con varias instancias haria falta una transaccion o un bloqueo en la base de datos.

**Profesionales:** pueden consultar `GET /api/pacientes` con informacion basica de **sus** pacientes (nombre, edad, sexo, foto), sin telefono, direccion ni responsables.

**Formato de errores:** `errors` es siempre una **lista** de `{ campo, mensaje }`; cualquier otro dato (p. ej. el horario con el que choca una cita) va en `detalles`.

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

## Solicitudes de cita

| Metodo | Ruta | Acceso |
|---|---|---|
| POST | `/api/solicitudes-cita` | Publico; comparte el limite de 20 envios por IP/hora con contacto |
| GET | `/api/solicitudes-cita?page=&limit=&estado=` | Administrador o recepcionista; mas recientes primero |
| GET | `/api/solicitudes-cita/:id` | Administrador o recepcionista |
| POST | `/api/solicitudes-cita/:id/convertir` | Administrador o recepcionista |
| PATCH | `/api/solicitudes-cita/:id/rechazar` | Administrador o recepcionista |

El alta recibe `nombre`, `correo`, `telefono`, `servicioId` activo, `fechaPreferida` (`AAAA-MM-DD`, desde hoy en Guatemala) y `mensaje` opcional. Responde 201 con una confirmacion sin datos personales. Guarda una solicitud PENDIENTE; no crea citas ni reserva horarios.

La conversion recibe `pacienteId`, `profesionalId`, `fecha`, `horaInicio` y `observaciones` opcionales. Usa el servicio guardado en la solicitud y las mismas validaciones de citas (paciente activo, responsable de menor, profesional activo, horario y traslapes). Devuelve 201 con la solicitud ATENDIDA y su referencia `cita`. Conserva usuario y fecha de gestion. El rechazo recibe `motivo` opcional (maximo 300 caracteres) y devuelve la solicitud RECHAZADA. Solo se gestionan solicitudes pendientes; repetir o competir por una ya gestionada devuelve 409.

La conversion y la cita se guardan en una misma transaccion: un fallo revierte ambas. Crear y reprogramar citas tambien usan transacciones y una escritura compartida por profesional (`revisionAgenda`, campo interno oculto), para que reservas concurrentes desde distintas sesiones no produzcan traslapes. Se requiere el replica set configurado; las operaciones dentro de cada transaccion son secuenciales. Referencia: [transacciones de Mongoose](https://mongoosejs.com/docs/transactions.html).

El seed recrea cinco solicitudes ficticias: tres pendientes, una atendida vinculada a una cita y una rechazada. Las pruebas cubren conversion repetida, carreras con reservas normales/rechazos y rollback despues de crear la cita. `npm run test:e2e` incluye el recorrido publico hasta su consulta en agenda, sobre una base temporal. El helper `node scripts/verificar-integracion.mjs --servir` imprime un puerto temporal libre para pruebas manuales; no ocupa el 4100 del desarrollo habitual.

## Materiales y asignaciones (RF-09)

Catalogo privado de apoyo, independiente del contenido educativo publicado en el portal. El administrador registra, consulta, modifica, activa y desactiva. El profesional consulta el catalogo activo y puede asignar recursos a pacientes que tiene o tuvo en sus citas (el mismo criterio de pertenencia de Mis pacientes). Recepcion no tiene acceso al modulo.

| Metodo | Ruta | Uso |
|---|---|---|
| GET | `/api/materiales?page=&limit=&q=&estado=` | Listado paginado; el profesional solo recibe activos |
| GET | `/api/materiales/:id` | Detalle; 404 para un material inactivo consultado por profesional |
| POST | `/api/materiales` | Alta, solo administrador |
| PUT | `/api/materiales/:id` | Edicion parcial, solo administrador |
| PATCH | `/api/materiales/:id/estado` | `{ estado: "ACTIVO" \| "INACTIVO" }`, solo administrador |
| GET | `/api/materiales/pacientes/:id?page=&limit=` | Historial, administrador o profesional del paciente |
| POST | `/api/materiales/pacientes/:id` | `{ materialId }`, administrador o profesional del paciente |

El material contiene `titulo` (2-160), `descripcion` (3-2000), `tipo` libre (2-60, por ejemplo Documento o Video), `enlace` HTTP/HTTPS sin credenciales (maximo 2000), `estado`, `createdAt` y `updatedAt`. La fecha de registro y el estado inicial ACTIVO los establece el servidor. Los enlaces se validan con [Zod](https://zod.dev/api); no se descargan desde la API ni requieren archivos fisicos.

Solo se asignan materiales activos a pacientes activos (RN-09). La asignacion conserva `material`, `asignadoPor` (id/nombre) y `createdAt`; no acepta fecha ni autor arbitrarios. Un indice unico por paciente/material impide duplicados incluso con peticiones concurrentes (409). El profesional recibe 404 si intenta acceder a un paciente ajeno. Al desactivar paciente o material se conserva el historial, incluido el recurso inactivo. No hay borrado fisico ni reasignacion duplicada. Editar un recurso actualiza la informacion consultada desde su asignacion.

El seed incluye cinco materiales ficticios (uno inactivo) y dos asignaciones. Los enlaces `example.com` son ilustrativos, no documentos reales. Las pruebas de `tests/materiales.test.ts` cubren permisos, URL inseguras, edicion, RN-09, historial y concurrencia; el verificador HTTP incluye el flujo de alta y asignacion.

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
