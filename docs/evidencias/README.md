# Evidencias del ensayo final

Capturas reales del 31 de octubre de 2026, en un entorno temporal con datos ficticios. Base aislada, API de puerto temporal y frontend en 5174; estos puertos de ensayo no modifican los predeterminados 4100/5173. Código base: PR #12 integrado (`be9c118`).

| Captura | Evidencia |
| --- | --- |
| [01 Portal](01-portal.png) | Inicio, carrusel, servicios y horarios. |
| [02 Administración](02-administracion.png) | Sesión de administrador y panel. |
| [03 Paciente y responsable](03-paciente-responsable.png) | Alta desde la interfaz y responsable nuevo asociado. |
| [04 Calendario](04-calendario.png) | Cita del paciente nuevo, 2 de noviembre, 08:00–08:30. |
| [05 Abono parcial](05-abono-parcial.png) | Q100 en efectivo; saldo Q150, estado PARCIAL. |
| [06 Pago completo](06-pago-completo.png) | Segundo abono Q150 por transferencia; saldo cero, PAGADO. |
| [07 Comprobante](07-comprobante.png) | Comprobante interno independiente del segundo abono. |
| [08 Cierre](08-cierre-caja.png) | Q300 de ingresos, esperado Q300, contado Q290 y faltante Q10. |
| [09 Móvil](09-cierre-movil.png) | Cierre a 390 × 844, sin desbordamiento horizontal. |
| [10 Historial](10-historial-paciente.png) | Tres pagos del paciente conservados. |
| [11 Permisos](11-permiso-profesional.png) | Profesional bloqueado al entrar a caja por URL. |

## Recorrido realizado

Desde el navegador: login administrador, alta de paciente adulto, alta y asociación de responsable, alta de servicio Q250/30 minutos, programación y confirmación de cita, consulta en calendario, apertura de caja Q200, abono Q100 EFECTIVO, abono Q150 TRANSFERENCIA, consulta del comprobante, segunda cita con abono Q50 TARJETA, consulta de movimientos, cierre con Q290, historial del paciente y acceso restringido como profesional.

Comprobaciones adicionales por API sobre esos mismos datos: traslape 409; nuevo cobro sin caja abierta 422; anulación de pago cerrado 422; profesional en pagos/caja 403. Consulta directa a MongoDB confirmó relación paciente/responsable, cita CONFIRMADA con precio 25000 y duración 30, tres pagos con comprobantes diferentes y caja CERRADA con diferencia -1000 y snapshot de ingresos/efectivo esperado de 30000 centavos.

Comprobantes del ensayo: `COMP-2026-000011`, `COMP-2026-000012` y `COMP-2026-000013`. La primera cita quedó pagada; la segunda conserva Q200 de saldo. La captura de móvil muestra el resumen superior; el diálogo permite desplazarse para consultar todos los movimientos. La consulta de consola del flujo financiero no registró errores ni advertencias.

Este ensayo combina interfaz, API y lectura de MongoDB. No se ejecutó desde la aplicación Postman ni desde Compass; la colección y el guion permiten repetirlo allí. La defensa oral corresponde al autor. La base temporal se elimina después del ensayo; las capturas conservan la evidencia.
