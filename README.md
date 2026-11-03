# SIGITSE

Prototipo académico de gestión de inspecciones ITSE. Los pagos y documentos son demostrativos.

- `sigitse-backend`: API NestJS, Prisma y PostgreSQL. [Arranque y migraciones](sigitse-backend/README.md).
- `sigitse-fronted`: portal React/Vite. Instalar con `npm ci` y ejecutar `npm run dev`.
- [SRS](SRS.md), [sprints](SPRINTS.md) y [plan de entrega](docs/planning/PLAN_ENTREGA_2026.md).

## Trabajo con Git

1. Partir de `main` actualizado y crear una rama corta, por ejemplo `feat/borrador-solicitud` o `fix/observaciones`.
2. Hacer commits concretos (`feat`, `fix`, `docs`, `ci`) que expliquen el resultado.
3. Abrir un PR hacia `main`, enlazar la historia de Taiga y describir qué se comprobó.
4. Integrar cuando las comprobaciones pasen; después eliminar la rama remota de trabajo.

No se necesita una rama `develop`. Las migraciones publicadas se conservan: los cambios de esquema posteriores usan una migración nueva. No subir `.env`, archivos de usuarios, respaldos ni exportaciones temporales de Taiga.

## Comprobaciones

En el frontend: `npm run lint` y `npm run build`.

En el backend: `npx prisma generate`, `npm run typecheck`, `npm run lint` y `npm test -- --runInBand`. Para la regresión HTTP, aplicar las migraciones a una base aislada llamada `sigitse_regression` y ejecutar `npm run test:integration` con su `DATABASE_URL`. No usar la base de desarrollo para esa prueba.

GitHub Actions ejecuta estas comprobaciones en cada PR.
