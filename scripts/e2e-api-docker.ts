/**
 * Corre `e2e-api/` (la suite de acciones del panel sin browser, ver su
 * comentario) contra el mismo server de `docker-compose.e2e.yml` que usa
 * `test:e2e:docker`: lo levanta, corre Vitest apuntando a él por
 * `E2E_BASE_URL` y lo baja al terminar, pase lo que pase con los tests.
 *
 * El `./data` de desarrollo no interviene en ningún momento: el contenedor
 * monta `./data-e2e` (ver e2e/env.ts y el comentario del compose).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

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

// Igual que en scripts/e2e-docker.ts: recrear el directorio desde el host,
// nunca dejar que lo cree Docker (quedaría de root).
rmSync(DATA_DIR, { recursive: true, force: true });
mkdirSync(DATA_DIR, { recursive: true });

let status = run('docker', [...COMPOSE, 'up', '--build', '--wait']);

if (status === 0) {
  status = run('npx', ['vitest', 'run', '--config', 'vitest.integration.config.ts'], {
    E2E_BASE_URL: BASE_URL,
  });
} else {
  console.error('El server de e2e no llegó a estar sano; últimos logs del contenedor:');
  run('docker', [...COMPOSE, 'logs', '--tail=50', 'app']);
}

const downStatus = run('docker', [...COMPOSE, 'down', '--remove-orphans']);

process.exit(status !== 0 ? status : downStatus);
