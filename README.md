# SIGITSE

Prototipo académico de gestión de inspecciones ITSE. Los pagos y documentos son demostrativos. La planificación se mantiene en Taiga.

## Arranque local

Requiere Node.js 24 y PostgreSQL.

En `sigitse-backend`, crear `.env` con `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. Después ejecutar:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

Si la base existente se creó con `prisma db push`, comprobar que coincide con la migración inicial antes de marcarla aplicada mediante `npx prisma migrate resolve --applied 0_init`. No reiniciar la base para instalar migraciones.

El administrado puede guardar solicitudes como borradores, editarlas y presentarlas después desde **Mis borradores**. El plazo de 9 días hábiles comienza al presentar la solicitud; los borradores no aparecen en las bandejas de funcionarios ni inspectores.

En otra terminal, desde `sigitse-fronted`:

```bash
npm ci
npm run dev
```

Portal: http://localhost:5173. API: http://localhost:3000.

El seed crea cuatro cuentas locales: `admin@example.com`, `funcionario@example.com`, `inspector@example.com` y `administrado@example.com`, con contraseña `123456`. Repetirlo conserva las cuentas existentes. No se crean estas cuentas en producción ni en bases remotas.

Para borrar los datos locales de prueba, aplicar las migraciones y cargar las cuentas y feriados, ejecutar `npm run db:reset` desde `sigitse-backend`. Este comando elimina todos los datos de la base configurada en `.env`; el arranque normal los conserva.

## Comprobaciones

- Frontend: `npm run lint` y `npm run build`.
- Backend: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` y `npm run build`.
- Integración: usar una base aislada llamada `sigitse_regression`, aplicar las migraciones y ejecutar `npm run test:integration` con su `DATABASE_URL`.

Trabajar en una rama por cambio y abrir un PR hacia `main`. No subir `.env`, archivos de usuarios ni respaldos. Las migraciones publicadas se conservan.
