# Revision operativa del avance 2

Base: PR #5 integrado (`0f537d3`). Rama de ajustes: `fix/cierre-avance-2`.
React y trabajo individual autorizados por el catedratico, segun confirmacion del usuario.

## Alcance y evidencia

Esta revision cubre el portal y la operacion de pacientes, responsables, servicios, solicitudes, citas, calendario y materiales. No equivale a la entrega final: pagos, saldos y cajas siguen pendientes. En particular, la consulta de pagos del paciente (parte de RF-03) se completara con finanzas.

| Requisito | Evidencia disponible |
|---|---|
| RF-01 Portal | Secciones publicas y contenido editable; carrusel minimo de cinco imagenes. Formularios de contacto y solicitud con persistencia. Pruebas frontend del portal y smoke de contenido/contacto/solicitudes. |
| RF-02 Roles | JWT, usuario activo y permisos en rutas backend; guards y menus frontend. Recepcion ahora consulta horarios desde el panel, sin controles de edicion; PUT continua exclusivo de administrador. |
| RF-03 Pacientes | Alta, busqueda, consulta, edicion, baja logica, edad calculada y citas relacionadas. Soporte de foto local/R2 y URL; seed ficticio muestra iniciales si no hay foto. Consulta financiera pendiente. |
| RF-04 Responsables | Alta/edicion, relaciones con varios pacientes, consulta y fotografias. Se exige responsable al programar un menor. |
| RF-05 Servicios | Alta, consulta, edicion, activacion/desactivacion; activos en portal. Precio en centavos y copia en la cita. |
| RF-06 Solicitudes | Solicitud no reserva; estados y conversion transaccional con paciente registrado. Referencia a cita conservada, rechazo auditado y proteccion contra conversion duplicada. |
| RF-07 Citas | Crear, confirmar, reprogramar, cancelar y completar segun rol; filtros e historial. Duracion/precio copiados y conservados tras editar el servicio. |
| RF-08 Calendario | FullCalendar con vistas mes/semana/dia, filtros, eventos y detalle desde API. Pruebas de calendario, contratos y recorrido en navegador de entregas anteriores. |
| RF-09 Materiales | Catalogo privado, enlaces, baja logica, asignaciones e historial. Profesional limitado a pacientes propios y recursos activos. |

## Reglas operativas

| Reglas | Verificacion |
|---|---|
| RN-01 | Smoke de traslapes/horarios adyacentes y pruebas Mongo de sesiones independientes; transacciones con escritura compartida de agenda. |
| RN-02 | Smoke de dias sin atencion, franjas partidas y limites de apertura/cierre; reprogramacion revalida horario. |
| RN-03, RN-04, RN-07, RN-14 | Smoke y pruebas de citas: paciente/profesional activos, servicio activo para nuevas citas y responsable de menor. Reprogramar conserva servicio y duracion historicos, incluso si el servicio se desactivo; no permite seleccionar ese servicio para una nueva cita. |
| RN-05, RN-06 | Smoke de transiciones: cancelada no se completa; completada no se edita ni reprograma. |
| RN-08, RN-10 | Smoke de login inactivo, tokens previos revocados y operaciones por rol. Rutas privadas exigen autenticacion y autorizacion. |
| RN-09 | Pruebas HTTP de materiales: paciente inactivo rechazado, paciente ajeno oculto al profesional, duplicado concurrente 409 e historial conservado. |
| RN-11, RN-12 | Smoke de pasado, fecha/hora invalida y hora final calculada con duracion copiada del servicio. |
| RN-13 | Solo PENDIENTE/CONFIRMADA bloquean disponibilidad; canceladas/completadas quedan fuera del filtro. Smoke de liberacion y disponibilidad. |

## Permisos revisados

| Operacion | Administrador | Recepcionista | Profesional |
|---|---|---|---|
| Usuarios, contenido, escritura de servicios y horarios | Si | No | No |
| Consulta de servicios/horarios | Si | Si | Portal publico |
| Pacientes/responsables | Gestion | Gestion | Informacion basica de pacientes propios |
| Solicitudes | Gestion | Gestion | No |
| Crear/confirmar/reprogramar/cancelar citas | Si | Si | No |
| Consultar citas / completar confirmadas | Todas / si | Todas / no | Propias / si |
| Materiales | Gestion y asignacion | No | Activos y asignacion a propios |
| Mensajes de contacto | Si | No | No |

## Datos de demostracion

El verificador de integracion crea una base temporal y, antes de modificarla, comprueba: 1 administrador, 2 recepcionistas, 3 profesionales, 10 pacientes, 5 responsables, 5 servicios, al menos 15 citas, 5 materiales y 5 solicitudes. Verifica referencias de citas, precios enteros positivos, duraciones coherentes, solicitud atendida vinculada y asignaciones existentes. El seed real contiene 17 citas; ya incluye menores con/sin responsable, paciente inactivo, recursos activos/inactivos y solicitudes en sus tres estados.

Los enlaces de materiales `example.com` son ilustrativos. No se recrea la base de desarrollo del usuario durante las pruebas. Los minimos de pagos/cajas corresponden a la siguiente etapa.

## Recorrido para revision del usuario

Validacion final: 253 pruebas frontend, 25 backend, 358 comprobaciones HTTP y 2 contratos; ambos builds correctos. Vista de horarios de recepcion verificada en navegador con API 4100/frontend 5173, en escritorio y 390 px, sin formulario de edicion, desbordamiento horizontal ni errores de consola.

1. Portal: consultar servicios y enviar una solicitud; confirmar que no reserva horario.
2. Recepcion: entrar a Horarios, consultar franjas sin poder editarlas; revisar solicitud y elegir paciente registrado/profesional/horario al convertir.
3. Citas/calendario: localizar cita, confirmar y reprogramar; comprobar que no permite traslapes ni fechas pasadas.
4. Profesional: consultar solo citas/pacientes propios, completar una confirmada y asignar material a paciente activo.
5. Administrador: revisar contenido, usuarios, mensajes y catalogo de materiales; desactivar recurso y comprobar historial conservado.

La publicacion de estos ajustes requiere el OK del usuario. La siguiente entrega prevista es apertura de caja, con contrato y pruebas propios; aun no se implementa en esta rama.
