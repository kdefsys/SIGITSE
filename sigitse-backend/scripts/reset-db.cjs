const { spawnSync } = require('node:child_process');

try {
  process.loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const database = new URL(process.env.DATABASE_URL ?? '');
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
) {
  throw new Error(
    'El reinicio solo está disponible para una base local de desarrollo.',
  );
}

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), 'migrate', 'reset', '--force'],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
