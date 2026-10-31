# Contrato: apertura y consulta de caja

Primera entrega financiera, desde main con PR #6 integrado. Alcance autorizado en el plan: apertura y consultas; pagos, movimientos, cierre y sus totales se implementaran en entregas posteriores.

Implementacion verificada en `feature/apertura-caja`: 258 pruebas frontend, 30 backend, 369 comprobaciones HTTP, 2 contratos y ambos builds. Navegador sobre base temporal: recepcion abre con Q19.99 y ve solo su caja; administrador consulta las cajas ajenas sin confundirlas con su caja actual; detalle y vista movil sin desbordamiento ni errores de consola. En la prueba de permisos se espera la carga inicial de modulos lazy antes de comprobar acceso denegado y ausencia de la pantalla financiera.

- `POST /api/cajas/abrir`: administrador o recepcionista abre exclusivamente su caja. Body `{ montoInicialCentavos }`, entero entre 0 y 999999999 (Q0.00 a Q9,999,999.99). Fecha/hora, responsable y estado ABIERTA los establece el servidor. No se admite escoger otro usuario ni estado/fecha arbitrarios. Devuelve 201 con caja y responsable (id/nombre).
- `GET /api/cajas/actual`: caja ABIERTA del usuario autenticado; 200 con caja o `null` si no existe. Un administrador tambien obtiene su propia caja en este endpoint.
- `GET /api/cajas?page=&limit=&estado=&usuarioId=`: listado por apertura descendente. Recepcion solo recibe sus cajas; filtrar otro usuario devuelve 403. Administrador puede consultar todas o filtrar por responsable. Estado opcional ABIERTA/CERRADA.
- `GET /api/cajas/:id`: detalle para propietario o administrador; 404 si pertenece a otro usuario. IDs y filtros invalidos devuelven 400.
- Profesional: 403 en todas las rutas. Sin sesion: 401.

Coleccion `cajas`: usuario (ref), apertura (Date UTC), montoInicialCentavos y estado ABIERTA/CERRADA. No hay modificacion ni borrado. Un indice unico parcial `{ usuario: 1 }` cuando estado=ABIERTA garantiza RN-22 entre peticiones y procesos distintos. Un duplicado devuelve 409; el cliente refresca su caja actual para mostrar la apertura ganadora. No se depende de un bloqueo en memoria.

Interfaz `/admin/caja`: monto en quetzales convertido con la utilidad monetaria existente, confirmacion tras persistir, caja propia visible y listado paginado. Administrador ve todas las cajas en el listado y recepcion solo propias. La pantalla informa apertura y monto inicial, sin presentar ingresos calculados ni controles de cierre antes de tener pagos.

Pruebas: cero y centavos exactos; negativos/decimales/strings/no finitos/montos excesivos; propiedad y roles; fecha/usuario/estado protegidos; dos aperturas concurrentes del mismo usuario (201/409); dos usuarios independientes; historial paginado; caja cerrada anterior no bloquea abrir otra. Las pruebas usan bases temporales. No se abre ni recrea la caja real del usuario durante verificaciones.
