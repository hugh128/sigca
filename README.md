# SIGCA - Sistema Integral de Gestión de Citas y Atención

Proyecto final del curso de Desarrollo Web.

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
npm run dev                 # http://localhost:4000/api

# 2) Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

Las imágenes se guardan en la carpeta `backend/uploads/` por defecto. Para usar Cloudflare R2 (solo se guarda la URL en la base de datos) sigue la sección «Cloudflare R2» de `backend/README.md`.

Ingreso al sistema: http://localhost:5173/admin — usuario `admin@sigca.test`, contraseña `Sigca2026!`
(todos los usuarios de prueba usan la misma contraseña; ver `backend/README.md`).
