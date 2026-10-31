# SIGCA - Sistema Integral de Gestión de Citas y Atención

Proyecto final del curso de Desarrollo Web.

Autor: **Hugo Ordoñez**. Carné: **2690-23-10929**.

Proyecto individual autorizado por el catedrático. Responsabilidades del autor: backend y API REST, modelos y base de datos, frontend e integración, pruebas, documentación y presentación. El cambio de Vue a React y la elección de las bibliotecas complementarias fueron autorizados por el catedrático, según confirmación del autor.

Tecnologías: React, TypeScript, Vite, React Router, Zustand, TanStack Query/Form, Tailwind CSS, Zod, Express, Mongoose y MongoDB. Autenticación JWT; imágenes en almacenamiento local o Cloudflare R2.

Requisitos: **Node.js 22.22 o superior** y MongoDB Server con replica set. Instalación verificada con Node.js 24.17.0 y npm 11.13.0. Compass es opcional y no sustituye al servidor MongoDB.

| Carpeta | Contenido | Documentación |
|---|---|---|
| `backend/` | API REST: Node.js, Express, TypeScript, MongoDB (Mongoose) | `backend/README.md` |
| `frontend/` | Portal y sistema administrativo: React, TypeScript, Tailwind | `frontend/README.md` |

## Puesta en marcha rápida

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env        # configura MONGODB_URI y JWT_SECRET
npm run db:start            # MongoDB local con transacciones (puerto 27018)
npm run seed                # datos de prueba
npm run dev                 # http://localhost:4100/api

# 2) Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

El seed recrea los datos de la base configurada: ejecutarlo únicamente sobre una base de demostración. Para instalar desde los archivos lock usar `npm ci` en cada carpeta. En PowerShell se puede copiar la configuración con `Copy-Item .env.example .env`.

La [verificación de entrega final](docs/entrega-final.md) registra la instalación limpia, los comandos de prueba y el guion de evaluación. Los detalles de variables de entorno, MongoDB y almacenamiento están en el [README del backend](backend/README.md).

Las imágenes se guardan en la carpeta `backend/uploads/` por defecto. Para usar Cloudflare R2 (solo se guarda la URL en la base de datos) sigue la sección «Cloudflare R2» de `backend/README.md`.

Ingreso al sistema: http://localhost:5173/admin — usuario `admin@sigca.test`, contraseña `Sigca2026!`
(todos los usuarios de prueba usan la misma contraseña; ver `backend/README.md`).

## Coleccion de API

Importar la [coleccion Postman](postman/SIGCA.postman_collection.json) y el [entorno local ficticio](postman/SIGCA-local.postman_environment.json). La [guia de pruebas](postman/README.md) explica las variables, permisos y el recorrido de citas, abonos, comprobantes y cierre de caja. Incluye una carpeta de lectura/sesion para ejecutar con Runner; los ejemplos de escritura se ejecutan individualmente con datos preparados.
