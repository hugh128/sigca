# Continuacion de SIGCA

Fecha: 2026-10-31. Base revisada: `adcb498` (PR #1 integrado).

## Estado verificado

- Implementados: autenticacion y roles, usuarios y profesionales, servicios, contenido institucional, horarios, almacenamiento local/R2, pacientes, responsables, citas, disponibilidad y calendario.
- Contacto integrado en main mediante PR #3: formulario `/contacto`, persistencia y bandeja `/admin/mensajes` exclusiva del administrador.
- Solicitudes integradas en main mediante PR #4: formulario publico, bandeja de administrador/recepcion, rechazo y conversion transaccional a cita.
- Materiales y asignaciones integrados mediante PR #5: catalogo privado, enlaces seguros e historial por paciente. Profesional limitado a pacientes propios; recepcion sin acceso.
- Revision operativa del avance 2 integrada mediante PR #6. Matriz de evidencia y limites en `verificacion-avance-2.md`.
- Recepcion ya consulta horarios desde el panel, sin controles de edicion. El backend conserva PUT exclusivo de administrador.
- Apertura y consulta de caja integradas mediante PR #7. Contrato en `apertura-caja.md`: propia por usuario, indice unico parcial, montos en centavos y consultas por propietario/administrador.
- Pagos, abonos y saldos integrados mediante PR #8. Comprobantes unicos, transacciones y consulta financiera de paciente/cita. Contrato en `pagos-abonos.md`.
- Anulacion auditada integrada mediante PR #9. Detalle fresco, motivo obligatorio y caja abierta; contrato en `anulacion-pagos.md`.
- Movimientos, totales y cierre de caja integrados en main mediante PR #10. Contrato en `cierre-caja.md`; seed con tres cajas y cierres generados por el servicio.
- Coleccion Postman y entorno ficticio preparados: 64 rutas de modulos, carpeta de 16 peticiones de lectura/sesion verificada contra API local y guia financiera. Ver `../postman/README.md`.
- Pendientes: ejecucion manual del recorrido completo en navegador/Postman, capturas y ZIP. Autor/responsabilidades e instalacion reproducible documentados.
- MongoDB original en 27017 se conserva. Instancia de SIGCA en 27018 con replica set local `sigca-rs`, respaldo y copia verificada de documentos e indices. Comandos y conexion documentados en backend/README.md.
- Validacion en copia limpia: npm ci en ambos proyectos, 271 pruebas frontend, 49 backend, 397 comprobaciones HTTP, 2 contratos y ambos builds. Corregido origen de imagenes del helper temporal, sin cambiar API de desarrollo. Autor documentado: Hugo Ordo?ez, carne 2690-23-10929. Evidencia y guion en `../docs/entrega-final.md`.

## Orden propuesto

1. Contacto: envio publico, persistencia y bandeja exclusiva del administrador. Entrega pequena que completa una omision del portal.
2. MongoDB para transacciones: replica set local autorizado y configurado; pruebas de commit, rollback y concurrencia aprobadas. Mantener ejecucion local documentada.
3. Solicitudes: envio publico sin reservar horarios, revision por administracion/recepcion, rechazo y conversion a cita existente en el calendario.
4. Materiales: catalogo administrativo, enlaces, asignaciones y consulta por paciente/profesional.
5. Revision de cierre del avance 2: permisos, seed, portal, reglas y recorrido de demostracion.
6. Finanzas: apertura de caja; registro de pagos y abonos; saldos y comprobantes; anulacion; cierre e historial.
7. Entrega: Postman, capturas, README y ensayo del procedimiento de evaluacion.

Cada modulo incluye API, interfaz y pruebas. Los pasos internos estan en `todo.md`; un paso de API no constituye por si solo una entrega funcional completa.

## Decisiones de arquitectura

- Mantener React, TypeScript, TanStack Form/Query, Zustand, Zod, Express y Mongoose.
- Reutilizar validadores, formularios, paginacion, buscadores, manejo de errores y servicios existentes.
- Los mensajes y solicitudes publicos usan `limiteFormularioPublico`; nunca exponen listados ni datos privados al visitante.
- Una solicitud no reserva ni garantiza una fecha. Al convertir se aplican las mismas reglas del servicio de citas, conservando la referencia entre solicitud y cita.
- La conversion debe ser consistente e impedir conversiones duplicadas bajo concurrencia. Probar fallos intermedios; no basta con ocultar el boton en la interfaz. Definir contrato transaccional antes de implementar.
- Materiales y publicaciones institucionales son conceptos distintos: las publicaciones actuales no sustituyen el catalogo asignable de RF-09.
- Para materiales comenzar con enlaces: los archivos fisicos no son obligatorios. Ampliar R2 a PDF solo si se acuerda; el endpoint actual procesa imagenes.
- Finanzas en centavos enteros; estados financieros derivados de pagos validos. Una caja abierta por usuario mediante indice unico parcial. Comprobantes unicos, operaciones atomicas y auditoria.
- No agregar dependencias ni actualizar versiones sin una necesidad concreta.

## Verificacion por entrega

- Pruebas nuevas que reproduzcan los casos relevantes antes de la implementacion.
- `npm test` y `npm run build` en ambos proyectos.
- `npm run test:e2e` en backend cuando cambien contratos o integracion; ampliar el verificador por modulo.
- Datos ficticios en bases de prueba independientes, con limpieza al terminar.
- Navegador real: envio, errores, permisos, adaptacion a pantalla pequena y consola/red.
- Revisar diff y credenciales antes de publicar.

## Flujo de Git

- Main actualizado al PR #11 (`160852f`). Verificacion de entrega final en `docs/verificacion-entrega-final`, con publicacion autorizada por el usuario.
- Las implementaciones salen del main actualizado en ramas propias. No mezclar contacto, solicitudes, materiales y finanzas en un unico PR.
- Commit, push y PR requieren el OK del usuario para cada entrega. El usuario aprueba y fusiona.
- El usuario aprobo el plan y autorizo configurar el replica set. Los modulos se desarrollan por entrega; publicar cambios requiere su OK.

## Riesgos y decisiones pendientes

| Tema | Tratamiento |
| --- | --- |
| Disponibilidad de MongoDB local | Ejecutar `npm run db:start` antes de la API; replica set local configurado con pruebas de rollback y concurrencia. |
| Agenda bajo concurrencia | Crear, convertir y reprogramar usan transacciones y escritura compartida por profesional. Pruebas de sesiones independientes verifican conflictos sin depender del bloqueo en memoria. |
| Permisos sobre asignaciones | Profesional opera sobre pacientes propios; backend valida propiedad, paciente activo y material activo. Administrador tiene control completo. |
| Datos personales | Solo datos ficticios en seed y pruebas; no publicar mensajes ni solicitudes en endpoints de lectura publicos. |
| Amplitud de finanzas | Separar apertura, pagos, anulacion y cierre, manteniendo invariantes entre modulos. |

## Siguiente entrega recomendada

Revisar y publicar la verificacion de entrega final solo con el OK del usuario. Despues, ensayar el flujo completo en navegador/Postman, preparar capturas y el ZIP de entrega para la defensa individual. Instalacion limpia, datos del autor y guion ya documentados. Contacto y solicitudes no envian correo automatico: el equipo coordina la atencion con los datos guardados.
