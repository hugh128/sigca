# Preparación de entrega final

Autor: Hugo Ordoñez, carné 2690-23-10929. Desarrollo individual y React autorizados por el catedrático, según confirmación del autor.

## Instalación reproducible

Se verificó una exportación limpia del commit `160852f` (PR #11), sin `node_modules`, `.env`, imágenes subidas ni compilaciones previas. Se instalaron ambos proyectos con `npm ci --no-audit --no-fund` y se copiaron exclusivamente sus `.env.example`. No se reutilizaron credenciales R2. Node.js 24.17.0, npm 11.13.0, Windows y MongoDB local con replica set ya iniciado en 27018.

Durante esa verificación se detectó y corrigió el origen de las imágenes del verificador de integración: ahora reserva el puerto temporal y establece `API_PUBLIC_URL` antes de cargar la aplicación. El smoke comprueba que la imagen pertenece al mismo origen de la API probada. Esto evita depender de una API de desarrollo abierta en 4100. No cambia el puerto ni el comportamiento normal de la aplicación.

Para reproducir desde un clon nuevo:

1. Instalar Node.js 22.22 o superior y MongoDB Server. Compass por sí solo no inicia el servidor. La versión de React Router del lock exige Node >=22.22; Vite requiere >=20.19 o >=22.12 y Mongoose >=20.19.
2. En `backend`, ejecutar `npm ci`, copiar `.env.example` a `.env` y generar un `JWT_SECRET` propio de al menos 32 caracteres. Usar `STORAGE_DRIVER=local` para funcionar sin cuentas externas.
3. Ejecutar `npm run db:start`. Este comando prepara el replica set local `sigca-rs` en 27018. Conservar `MONGODB_URI=mongodb://localhost:27018/sigca?replicaSet=sigca-rs`, o elegir otra base de demostración en ese replica set.
4. En `frontend`, ejecutar `npm ci` y copiar `.env.example` a `.env`.
5. Ejecutar las comprobaciones siguientes. Las pruebas Mongo y el helper de integración crean bases temporales; no es necesario ejecutar seed sobre la base de desarrollo para probar.
6. Para demostrar la interfaz, ejecutar `npm run seed` solo sobre la base de demostración elegida y luego `npm run dev` en ambos proyectos. API 4100, frontend 5173. El seed reemplaza datos; no usarlo sobre una base con información que se quiera conservar.

```powershell
# Desde backend
npm test
npm run test:e2e

# Desde frontend
npm test
npm run build

# Desde la raíz; --api requiere la API normal iniciada
node postman/verificar.mjs
node postman/verificar.mjs --api
```

`test:e2e` compila backend, verifica los mínimos del seed, ejecuta los dos contratos frontend/API y el smoke HTTP en una API de puerto temporal. La base temporal se elimina en `finally`. No modifica la configuración de los servidores de desarrollo. Las imágenes de prueba se guardan en `uploads` de la copia donde se ejecuta; usar una copia aislada si se quiere conservar limpio el directorio de subidas habitual.

Resultado en la copia limpia, aplicando únicamente la corrección de los dos scripts de integración descrita arriba: 49 pruebas backend, 271 frontend, 2 contratos y 397 comprobaciones HTTP aprobadas; compilaciones backend y frontend correctas. El verificador de Postman también valida las 64 rutas. El build frontend conserva el aviso existente sobre la importación estática/dinámica de `Prohibido.tsx`; no bloquea la compilación. Esta comprobación no incluye instalar MongoDB desde cero, probar otro sistema operativo ni desplegar en producción.

## Guion de evaluación de la sección 16

Preparar datos ficticios, una fecha futura dentro del horario y un profesional activo. Guardar los identificadores de paciente, servicio, cita, pagos y caja. El ensayo realizado y las capturas están en [evidencias](evidencias/README.md). Se distingue lo ejecutado en navegador de las comprobaciones adicionales por API y MongoDB.

| Paso solicitado | Acción y resultado esperado |
| --- | --- |
| Iniciar sesión | Administrador del seed `admin@sigca.test` / `Sigca2026!`; ingresar al panel. |
| Registrar paciente | Crear paciente ficticio; verificar persistencia, edad y detalle. |
| Asociar responsable | Registrar responsable y vincularlo; un menor sin responsable no puede recibir cita. |
| Crear servicio | Precio Q250.00 y duración 30 minutos; internamente 25000 centavos. |
| Programar cita | Elegir paciente, servicio, profesional y disponibilidad futura; el servidor calcula fin y copia precio/duración. |
| Intentar traslape | Repetir profesional y horario; rechaza con 409 y no crea otra cita. |
| Confirmar | Cambiar PENDIENTE a CONFIRMADA. |
| Consultar calendario | Abrir fecha/cita, contrastar paciente, servicio, profesional, horario y estado. |
| Abrir caja | Propia con Q200.00; rechaza una segunda abierta para el mismo usuario. |
| Registrar abono | Q100.00 EFECTIVO; genera comprobante y asigna automáticamente caja propia. |
| Consultar saldo | Q150.00 pendiente, estado PARCIAL. |
| Segundo pago | Q150.00 TRANSFERENCIA sobre la misma cita. |
| Estado PAGADO | Saldo Q0.00; pago adicional rechazado. |
| Comprobante | Abrir detalle de cada abono; números diferentes y datos originales conservados. |
| Diferentes métodos | En otra cita con saldo, registrar Q50.00 TARJETA. No incrementa efectivo esperado. |
| Ingresos | Si solo existen esos tres cobros: efectivo Q100, transferencia Q150, tarjeta Q50, ingresos Q300. |
| Efectivo contado | Esperado Q300 (inicial Q200 + efectivo Q100); contar Q290. |
| Cerrar caja | Diferencia -Q10, mostrado como faltante; fecha, responsable y totales conservados. |
| Bloqueo posterior | Antes de abrir otra caja, intentar cobrar una cita con saldo: rechazo. Anular pago del cierre también se rechaza. |
| Historial paciente | Ver abonos independientes, comprobantes y saldo derivado; caja cerrada mantiene movimientos. |
| MongoDB | En Compass, conectar al replica set/base de demostración y localizar paciente, cita, pagos y caja por sus identificadores. Comparar centavos y referencias. |
| Otro rol | Profesional consulta solo sus citas/pacientes y recibe 403 en pagos/caja; recepción no administra usuarios/contenido. |

Las cajas preexistentes o cobros adicionales cambian los totales: comprobar movimientos antes de comparar el ejemplo. Para demostrar anulaciones, usar otra caja abierta, anular con motivo y verificar que el movimiento permanece, pero deja de sumar ingresos y vuelve a aumentar el saldo. Consultar también [la guía Postman](../postman/README.md).

## Puntos para la defensa individual

- Seguir una petición desde React/TanStack Form a rutas Express, validación Zod, servicio y modelos Mongoose. Explicar el manejo de errores uniforme.
- Distinguir sesión/UI en Zustand de datos del servidor en TanStack Query; mostrar rutas y guards de React Router y permisos independientes en backend.
- Explicar JWT, verificación de usuario activo, roles y restricción a citas/pacientes propios del profesional.
- Mostrar precio y duración copiados en la cita, centavos enteros y estado financiero derivado exclusivamente de pagos REGISTRADO.
- Explicar transacciones, contador de comprobantes, índice único de caja abierta y escritura compartida para resolver carreras pago/cierre/anulación.
- Mostrar que transferencia/tarjeta suman ingresos, pero no efectivo esperado, y que el cierre conserva su snapshot.
- Identificar los archivos para una modificación pequeña: esquema de validación, servicio de negocio, formulario y prueba relevante. Evitar cambiar reglas para hacer pasar una demostración.

## Evidencias y pendientes

Las capturas finales deben mostrar portal, administración, pacientes, calendario, pagos y caja, con datos ficticios y sin tokens ni archivos `.env`. Preparar también un ZIP de código sin `node_modules`, `.env`, `.local`, subidas de prueba ni archivos internos de Git, junto con el enlace al repositorio.

Ensayo de interfaz y capturas completados; restricciones contrastadas por API y registros revisados directamente en MongoDB. Ver [evidencias](evidencias/README.md). La ejecución desde Postman/Compass y la defensa oral pueden repetirse con el guion; no se afirma haber operado esas aplicaciones.

Desde la raíz, ejecutar `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/preparar-entrega.ps1` para generar un ZIP y su SHA256 en `.local/entrega/`. Incluye código, locks, ejemplos de entorno, documentación y capturas; rechaza archivos locales o secretos por nombre. Incluye los cambios de la rama, por lo que se debe regenerar después del commit/merge definitivo. Revisar que no se hayan añadido credenciales reales antes de empaquetar.

Pendiente del autor: aprobar la entrega, regenerar el ZIP de la revisión definitiva, practicar la explicación del código y subir el ZIP y el enlace GitHub a Canvas. No se ha realizado ese envío.
