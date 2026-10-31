# Pruebas de SIGCA con Postman

Importar `SIGCA.postman_collection.json` y `SIGCA-local.postman_environment.json`, y seleccionar el entorno **SIGCA local (datos ficticios)**. La API debe estar iniciada con MongoDB en replica set; seguir [backend/README.md](../backend/README.md). No hace falta instalar dependencias adicionales para estos archivos.

El entorno contiene unicamente la cuenta ficticia del seed. Los tokens se entregan vacios. No exportar ni subir un entorno con sesiones reales.

## Comprobacion inicial

Ejecutar solamente la carpeta **00 - Lectura y sesion (apta para Runner)** con el usuario administrador del seed. Primero inicia sesion y guarda `token` en el entorno; despues consulta los modulos sin modificar datos del negocio. Contiene 16 peticiones con comprobaciones del codigo HTTP y del token. Las carpetas restantes son un catalogo para ejecucion individual: el orden del catalogo no prepara automaticamente las dependencias de cada operacion.

La coleccion contiene ejemplos para las 64 rutas de los modulos y la consulta de salud. Los permisos y reglas de negocio pueden producir un rechazo legitimo si los datos seleccionados no cumplen sus condiciones; cada ejemplo de exito espera el codigo correspondiente a una ejecucion preparada correctamente.

Desde la raiz del repositorio se puede verificar el JSON, las variables, la sintaxis de los scripts y la cobertura contra las rutas Express:

```powershell
node postman/verificar.mjs
node postman/verificar.mjs --api
```

La segunda opcion ejecuta las mismas 16 peticiones y scripts de lectura/sesion contra `http://localhost:4100/api`. No guarda el token en archivos. Para otra API local, configurar `POSTMAN_API_URL` en esa terminal. Este verificador no sustituye la importacion en Postman ni las pruebas de integracion `npm run test:e2e` del backend.

## Variables y datos previos

| Variable | Preparacion |
| --- | --- |
| `baseUrl` | Incluye `/api`; predeterminado `http://localhost:4100/api`. |
| `email`, `password` | Usuario ficticio con el rol que se desea probar. Ejecutar login cada vez que se cambien. |
| `token` | Capturado por login; heredan esta sesion las peticiones privadas. |
| `pacienteId`, `responsableId`, `servicioId`, `materialId`, `usuarioId` | Copiar `id` de un listado/detalle o crear un registro. Las altas exitosas guardan su identificador en el entorno. |
| `profesionalId` | Copiar un profesional activo de `GET /usuarios/profesionales`. |
| `citaId` | Alta exitosa de cita o `id` de una cita existente no cancelada. |
| `solicitudId` | Copiar de la bandeja privada; el alta publica solo devuelve una confirmacion, sin identificador. |
| `pagoId` | Capturado al registrar un pago; tambien puede copiarse del listado. |
| `cajaId` | Capturado al abrir una caja; para historicos copiar del listado. |
| `fecha`, `horaInicio` | Fecha futura `AAAA-MM-DD` y hora local de Guatemala `HH:mm`. Consultar disponibilidad y horarios antes de programar. |
| `claveContenido` | Predeterminado `misionVision`; el ejemplo PUT corresponde a esa seccion. Para otra clave, adaptar el cuerpo a su esquema. |
| `nuevoEmail` | Elegir un correo ficticio distinto al repetir el alta de usuarios. |
| `tokenProfesional` | Copiar un token obtenido al iniciar sesion como profesional, para la prueba independiente de acceso denegado. |

Las consultas paginadas devuelven `items`; otros listados pueden devolver arreglos. Utilizar el campo `id`, no `_id`. Al repetir una prueba de alta se crea otro registro. Las acciones de estado, anulacion y cierre cambian los datos seleccionados y deben ejecutarse con datos ficticios preparados para la demostracion.

## Recorrido operativo y financiero

1. Iniciar sesion como administrador. Crear un paciente adulto y un responsable, y asociarlos con `POST /pacientes/:id/responsables`. Para un menor, asociar el responsable antes de programar.
2. Crear el servicio del ejemplo: Q250.00, duracion 30 minutos. Se guarda `servicioId`. Elegir un profesional activo, fecha futura y hora disponible mediante `GET /citas/disponibilidad`.
3. Crear la cita y conservar `citaId`. Repetir el alta en el mismo horario debe producir **409**. Confirmar con `PATCH /citas/:id/estado`. Consultar la cita en el calendario del frontend.
4. Consultar `GET /cajas/actual`. Si no existe una abierta para la sesion, abrirla con 20000 centavos (Q200.00); se guarda `cajaId`. Repetir apertura debe producir **409**. El administrador del seed tiene cierres historicos y puede abrir una nueva; recepcion2 ya tiene una abierta.
5. Registrar el primer pago del ejemplo: 10000 centavos, EFECTIVO. Consultar `/pagos/citas/:id/resumen`: costo 25000, pagado 10000, saldo 15000 y estado PARCIAL.
6. Cambiar el cuerpo de POST `/pagos` a 15000 centavos y TRANSFERENCIA, manteniendo `citaId`. Consultar resumen: saldo cero y estado PAGADO. GET `/pagos/:id` muestra el comprobante interno del ultimo abono. Un abono adicional debe producir **422**.
7. Consultar `/pagos?pacienteId={{pacienteId}}`, `/pagos?metodo=EFECTIVO` y `/pagos?desde={{fecha}}&hasta={{fecha}}`. El filtro de pagos usa la fecha del cobro, no la fecha futura de la cita: para filtrar los cobros recien hechos, usar la fecha de hoy en Guatemala.
8. Consultar detalle y movimientos de `cajaId`. Si solo se hicieron esos dos pagos, los ingresos suman Q250.00 y el efectivo esperado es Q300.00 (Q200.00 iniciales + Q100.00 efectivo). El ejemplo de cierre cuenta 30000 centavos, sin diferencia. Cambiar a 29000 para demostrar faltante de Q10.00.
9. Cerrar y volver a consultar: conserva totales, diferencia, fecha, responsable y movimientos. Repetir cierre produce **409**. Anular el pago de esa caja cerrada produce **422**. Para comprobar rechazo de un nuevo cobro sin caja abierta, seleccionar otra cita con saldo: **422**. No abrir otra caja antes de esa comprobacion.
10. Consultar el historial del paciente y la caja cerrada. Puede abrirse una nueva caja sin modificar el cierre anterior.

Para demostrar TARJETA y anulacion, usar otra cita con saldo y una caja propia abierta. Registrar un pago con TARJETA, consultar su comprobante y anularlo con motivo antes del cierre. El pago permanece en movimientos como ANULADO, se recalcula el saldo y se excluye de los ingresos. Volver a consultar el resumen de caja antes de decidir el efectivo contado.

Las operaciones de cierre y anulacion son independientes del recorrido de confirmacion: no ejecutar todos los ejemplos de estado del catalogo de forma indiscriminada. No existe eliminacion fisica de pagos ni reapertura de caja.

## Otros modulos y permisos

- Contacto y alta de solicitudes son publicos. La solicitud no reserva horario. Listar como administrador/recepcion, copiar una PENDIENTE y elegir convertir **o** rechazar; una atendida conserva la cita generada.
- Materiales: administrador crea/edita/desactiva; administrador y profesional consultan/asignan. El profesional solo asigna a sus pacientes activos. Recepcion obtiene 403.
- Usuarios, escritura de servicios, contenido y horarios requieren administrador. El ejemplo de semana reemplaza los siete dias: usarlo solo si se desea guardar ese horario.
- Subidas: seleccionar un archivo de imagen local en `archivo`, maximo 5 MB; `carpeta=general`. Postman establece `multipart/form-data` y su boundary. No hay una imagen local incluida en el entorno.
- Para probar otro rol, cambiar `email` a `recepcion1@sigca.test` o a un profesional listado en el seed y ejecutar login. La carpeta inicial completa requiere administrador; otros roles tienen restricciones deliberadas.
- En **Validaciones y permisos**, la prueba 401 no envia sesion; pago cero requiere sesion administrativa y un `citaId` valido; la prueba 403 requiere `tokenProfesional` vigente. Sin ese token devuelve 401, no 403.

## Alcance de esta entrega

Se verificaron las variables, el JSON, la sintaxis de los scripts, la cobertura de rutas y las 16 peticiones de lectura/sesion en la API local. Las escrituras cuentan con ejemplos preparados a partir de los esquemas del backend; el recorrido completo dentro de Postman, las capturas y el ensayo integral de la seccion 16 quedan pendientes. Las pruebas automatizadas de negocio y concurrencia permanecen en el backend.
