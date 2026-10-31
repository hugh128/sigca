# Tareas de continuacion

Plan y orden aprobados por el usuario. Dependencias y criterios generales: `plan.md`. Publicar cada entrega requiere un OK separado.

## Entrega 1: Contacto

### 1. Persistencia de mensajes
- [x] Definir campos RF-01 y esquema Zod; rechazar entradas invalidas sin persistirlas.
- [x] Crear modelo y servicio con alta y listado paginado; preservar mensajes completos para el administrador.
- Verificacion: pruebas de servicio en base temporal, incluyendo fechas y paginacion; build backend.
- Dependencias: ninguna. Archivos previstos: modelo, schema, servicio y prueba de contacto (4).

### 2. API de contacto
- [x] Exponer POST publico limitado y GET solo administrador; registrar rutas.
- [x] Probar 201, 400, 401, 403 y rate limit sin devolver datos privados al visitante.
- Verificacion: pruebas HTTP en entorno aislado y build backend.
- Dependencias: 1. Archivos previstos: controlador, rutas de contacto, indice de rutas y prueba HTTP (4).

### 3. Formulario publico
- [x] Crear `/contacto` con datos institucionales existentes y TanStack Form/Zod.
- [x] Mostrar confirmacion solo tras persistir; preservar valores ante error y prevenir doble envio durante la peticion.
- Verificacion: Testing Library, build frontend y navegador.
- Dependencias: 2. Archivos previstos: pagina, schema, cliente API y prueba de formulario (4).

### 4. Bandeja administrativa
- [x] Administrador consulta mensajes con paginacion y detalle; otros roles carecen de acceso.
- [x] Integrar rutas y enlaces publicos/administrativos del modulo.
- Verificacion: pruebas de permisos, navegacion y navegador en pantalla pequena.
- Dependencias: 3. Archivos previstos: bandeja, router, menus publico y privado, prueba de permisos (5).

### Cierre de entrega 1
- [x] Actualizar README y datos ficticios de mensajes.
- [x] Suites y builds correctos; formulario y bandeja conectados a MongoDB real.
- [ ] Revisar diff con el usuario; esperar OK antes de commit, push y PR.

## Entrega 2: Base transaccional

### 5. Preparar ejecucion y pruebas
- [x] Acordar replica set local y documentar arranque sin publicar credenciales.
- [x] Probar commit, rollback y aislamiento de las bases temporales con la configuracion elegida.
- Verificacion: pruebas MongoDB y `npm run test:e2e`.
- Dependencias: decision del usuario aprobada (replica set local). Configuracion y pruebas integradas en main mediante PR #2.

## Entrega 3: Solicitudes de cita

### 6. Recepcion de solicitudes
- [x] Modelo/validacion/servicio para datos RF-06, estado inicial PENDIENTE y servicio activo; no crear citas ni ocupar horarios.
- [x] Registrar cinco solicitudes ficticias en seed.
- Verificacion: pruebas de servicio con MongoDB.
- Dependencias: ninguna para recepcion; 5 antes de conversion. Archivos previstos: modelo, schema, servicio, seed, prueba (5).

### 7. Endpoints y conversion
- [x] POST publico limitado, listado protegido y rechazo solo de solicitudes pendientes.
- [x] Conversion transaccional: paciente registrado, reglas de citas, referencia conservada, repeticion/concurrencia sin duplicados y rollback si falla.
- Verificacion: HTTP, transacciones y dos conversiones concurrentes.
- Dependencias: 5 y 6. Archivos previstos: controlador, rutas, indice, servicio y pruebas HTTP (5).

### 8. Portal y revision interna
- [x] Formulario publico con servicio preseleccionado desde servicios y aviso de que la solicitud no reserva horario.
- [x] Bandeja para administrador/recepcion; elegir paciente, profesional y horario al convertir; ofrecer registro del paciente cuando no exista.
- Verificacion: componentes, contratos y flujo visitante → solicitud → cita → calendario.
- Dependencias: 7. Dividir en dos incrementos: formulario/API/schema/pruebas; bandeja/rutas/menu/pruebas (4 archivos por incremento, segun reutilizacion).

### Cierre de entrega 3
- [x] Revisar seed y documentacion; ejecutar suites, builds y navegador.
- [ ] Solicitar OK antes de commit, push y PR.

## Entrega 4: Materiales

### 9. Catalogo
- [x] Administrador registra, edita, consulta y desactiva materiales con enlace; profesional puede consultar activos.
- [x] Diferenciar este catalogo de las publicaciones publicas existentes.
- Verificacion: validacion de enlaces y permisos, API, formulario y listado.
- Dependencias: ninguna de solicitudes. Incrementos: modelo/schema/servicio/pruebas; controlador/rutas/indice/pruebas; API/pagina/rutas/menu/pruebas (4–5 archivos cada uno).

### 10. Asignaciones
- [x] Asignar solo materiales y pacientes activos; profesional limitado a pacientes propios; conservar fecha y usuario.
- [x] Consultar asignaciones desde paciente y vista del profesional, sin duplicados involuntarios.
- Verificacion: casos RN-09, propiedad de paciente y flujo en navegador.
- Dependencias: 9. Incrementos separados para modelo/servicio/pruebas (3), API/rutas/permisos/pruebas (4) e interfaz/API/pruebas (3).

### Cierre del avance 2
- Materiales integrados mediante PR #5. Revision de cierre: 253 pruebas frontend, 25 backend, 358 comprobaciones HTTP, 2 contratos, builds y navegador de horarios para recepcion en escritorio/movil.
- [x] Revisar acceso de recepcion a consulta de horarios y todos los permisos RF-02.
- [x] Completar seed operativo y verificar alcance operativo RF-01 a RF-09 y RN-01 a RN-14; consulta de pagos de RF-03 pendiente en finanzas. Evidencia y recorrido en `verificacion-avance-2.md`.
- [ ] Solicitar OK antes de publicar cada entrega; no agrupar todos los modulos en un solo PR.

## Entregas financieras

Detallar contratos e incrementos antes de implementar, con los criterios siguientes como alcance obligatorio.

### 11. Apertura de caja
- [x] Usuario autorizado abre su caja con monto inicial; indice impide dos cajas abiertas, incluso bajo concurrencia.
- [x] Recepcion consulta solo propias; administrador consulta todas.
- Verificado: 258 pruebas frontend, 30 backend, 369 comprobaciones HTTP, 2 contratos, ambos builds y navegador (apertura con Q19.99, consulta por administrador y movil). Seed con una caja de recepcion2; minimos finales de cajas/cierres pendientes de etapa 13. Publicacion pendiente del OK del usuario.
- Verificacion: API, concurrencia y apertura desde interfaz.
- Dependencias: 5. Incrementos: modelo/schema/servicio/pruebas; controlador/rutas/indice/pruebas; API/pagina/menu/rutas/pruebas (4–5 archivos).

### 12. Pagos y saldos
- [x] Pago/abono en centavos asociado a cita y caja propia abierta; no superar costo incluso con peticiones concurrentes.
- [x] Comprobante unico y saldo/estado financiero derivados de pagos validos; consulta desde cita e historial financiero desde paciente.
- Verificado en `feature/pagos-abonos`: 262 pruebas frontend, 37 backend, 379 comprobaciones HTTP, 2 contratos, builds y navegador (abono Q19.99, saldo Q80.01 y pago completo; movil y comprobante). Seed con diez abonos, parciales/completos y tres metodos. Anulaciones/cierres pendientes. Publicacion requiere OK del usuario.
- Verificacion: RN-15 a RN-20, RN-24 a RN-26 y RN-28; carrera entre dos abonos.
- Dependencias: 11. Descomponer antes de implementar: persistencia/contador; servicio transaccional; API; interfaz de registro; consulta de historial.

### 13. Anulacion y cierre
- [x] Anular con motivo, fecha y usuario solo en caja abierta; impedir cancelar cita con pagos validos.
- Verificacion de anulaciones: 268 pruebas frontend, 43 backend, 389 comprobaciones HTTP, 2 contratos, builds y navegador (auditoria, saldo recalculado y movil). Incluye cache al reabrir, propiedad/caja cerrada, repeticion, carreras y rollback. Seed con una anulacion auditada. Pendiente OK para publicar.
- [x] Cierre calcula totales/efectivo/diferencia, conserva detalle y bloquea pagos, anulaciones y cambios posteriores.
- Verificacion de cierre: 271 pruebas frontend, 49 backend, 396 comprobaciones HTTP, 2 contratos y builds. Navegador: cierre con esperado Q312.50/contado Q302.50, faltante Q10.00 y auditoria; historial inmutable y vista movil sin errores. Carreras y rollback probados en bases temporales. Publicacion autorizada por el usuario.
- Verificacion: RN-19 a RN-29, carreras pago/cierre y anulacion/cierre; demostracion completa.
- Dependencias: 12. Descomponer antes de implementar: anulacion; integracion con cancelacion; calculo/cierre; API; interfaz/historial.

### 14. Entrega final
- [x] Completar seed minimo: 10 pagos, 3 cajas abiertas/cerradas, abonos, anulaciones y saldos; conservar minimos operativos. Minimos y auditoria verificados en el helper de integracion.
- [x] Preparar coleccion Postman y entorno ficticio, documentar dependencias/recorrido, verificar cobertura de 64 rutas y ejecutar 16 peticiones/scripts de lectura contra API local.
- [x] Completar README con Hugo Ordo?ez, carne 2690-23-10929, responsabilidades y requisito real de Node; documentar ejecucion local y guion de defensa.
- [x] Verificar npm ci, suites y builds desde exportacion limpia: 271 frontend, 49 backend, 397 HTTP, 2 contratos. Corregir origen de imagenes de API temporal, con comprobacion de regresion.
- [x] Ejecutar recorrido de interfaz, restricciones por API y verificacion directa en MongoDB; once capturas y script de ZIP/SHA256. Postman/Compass no operados.
- [x] Ensayar el flujo funcional de seccion 16 en navegador/API/MongoDB, documentando el alcance en evidencias; instalacion limpia verificada.
- [ ] Autor: defensa oral, aprobacion final, regeneracion del ZIP definitivo y entrega en Canvas.
- Dependencias: 13. Incrementos de datos, documentacion/coleccion y evidencias, independientes del codigo funcional.
