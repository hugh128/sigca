# Contrato: anulacion de pagos

Base: PR #8 integrado. Alcance: detalle fresco de pago y anulacion autorizada/auditada; movimientos y cierre de caja se implementan despues.

Implementado en `feature/anulacion-pagos`. Verificado con 268 pruebas frontend, 43 backend, 389 comprobaciones HTTP, 2 contratos y ambos builds. Navegador sobre base temporal: anulacion de Q50.00, comprobante conservado con motivo/autor/fecha y saldo pendiente Q150.00; vista movil sin desbordamiento ni errores de consola. La prueba de cache confirma que al reabrir no se ofrecen acciones hasta terminar la consulta actual. Datos de desarrollo conservados. Publicacion pendiente del OK del usuario.

- GET `/api/pagos/:id`: administrador/recepcionista. Pago con auditoria, `cajaEstado` y `puedeAnular` calculado (no almacenado). No expone datos privados adicionales del responsable. Profesional 403; sin sesion 401.
- PATCH `/api/pagos/:id/anular`: body `{ motivo }`, texto recortado de 3 a 300 caracteres. Administrador sobre cualquier caja abierta; recepcionista solo caja propia abierta. No necesita abrir otra caja para anular un pago de una caja ya abierta. Responsable y fecha de anulacion son del servidor. Devuelve 200 con pago ANULADO y auditoria; repeticion o competencia entre anulaciones 409; caja cerrada 422; caja ajena a recepcion 403; pago inexistente 404.
- No modifica monto, metodo, comprobante, fecha original, paciente, cita ni caja. Conserva `motivoAnulacion`, `anuladoPor` y `fechaAnulacion`. Sin edicion ni borrado fisico.
- La transaccion lee el pago, valida propiedad/estado de caja, escribe revision de caja, escribe revision financiera de cita y guarda la anulacion. Mismo orden de bloqueo que el cobro: caja -> cita. Fallos revierten todo. La escritura compartida permite serializar anulacion, nuevo abono y cancelacion de cita; el futuro cierre tambien debera escribir la caja en transaccion.
- Saldo/estado financiero siguen derivados de pagos REGISTRADO; al anular se libera el saldo. Cancelar solo se permite cuando no quedan pagos validos. Anular no cancela ni devuelve dinero automaticamente: registra la invalidacion del comprobante.

UI: abrir comprobante consulta su detalle actual en API. Si puede anular, ofrece formulario de motivo obligatorio y confirmacion explicita. Espera persistencia, refresca detalle/historial/saldo y muestra auditoria. Sin boton para pagos anulados o cajas cerradas/ajenas; mensajes claros explican la restriccion. No se implementan devoluciones ni cierre.

Pruebas: motivo vacio/largo; roles y propiedad; caja cerrada; auditoria protegida; repeticion/concurrencia; rollback al fallar guardado; saldo y cancelacion tras anular; carrera con nuevo abono; no borrado fisico. Seed incorpora una anulacion auditada conservando los diez pagos y los estados financieros demostrables. Verificaciones con escrituras en bases temporales.
