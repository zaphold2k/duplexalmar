/**
 * Corre la suite e2e contra el server de docker-compose.e2e.yml:
 * levanta el contenedor, ejecuta Playwright apuntando a él y lo baja al
 * terminar, pase lo que pase con los tests. Los argumentos extra van a
 * Playwright tal cual (p. ej. `npm run test:e2e:docker -- e2e/whatsapp.spec.ts`).
 *
 * El `./data` de desarrollo no interviene en ningún momento: el contenedor
 * monta `./data-e2e` (ver e2e/env.ts y el comentario del compose).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

// `--env-file .env.e2e`: sin eso Compose lee el `.env` de desarrollo para
// interpolar `${VAR}` en el compose (no hay ninguna), y avisa por cada `$`
// del hash de contraseña que encuentra ahí.
const COMPOSE = ['compose', '-f', 'docker-compose.e2e.yml', '--env-file', '.env.e2e'];
const BASE_URL = 'http://localhost:4322';
const DATA_DIR = 'data-e2e';

function run(command: string, args: string[], env: NodeJS.ProcessEnv = {}): number {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

// Un directorio de datos que quedó de una corrida interrumpida haría fallar
// el global-setup (exige el estado vacío). Se recrea desde el host antes del
// `up`: si lo creara Docker al montar, sería de root y la app no podría
// escribir (ver README, "Despliegue con Docker Compose").
rmSync(DATA_DIR, { recursive: true, force: true });
mkdirSync(DATA_DIR, { recursive: true });

// El contenedor corre con este mismo uid:gid (ver docker-compose.e2e.yml):
// sin esto, un archivo o carpeta que el host cree primero dentro de `/data`
// (los tests siembran fotos llamando a `processUploadBatch` directamente, no
// por HTTP) puede quedar sin permiso de escritura para el `node` (uid 1000)
// fijo de la imagen si el uid del runner no coincide.
process.env.E2E_UID = String(process.getuid?.() ?? 1000);
process.env.E2E_GID = String(process.getgid?.() ?? 1000);

let status = run('docker', [...COMPOSE, 'up', '--build', '--wait']);

if (status === 0) {
  status = run('npx', ['playwright', 'test', ...process.argv.slice(2)], { E2E_BASE_URL: BASE_URL });
} else {
  console.error('El server de e2e no llegó a estar sano; últimos logs del contenedor:');
  run('docker', [...COMPOSE, 'logs', '--tail=50', 'app']);
}

const downStatus = run('docker', [...COMPOSE, 'down', '--remove-orphans']);

process.exit(status !== 0 ? status : downStatus);
