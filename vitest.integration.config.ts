import { defineConfig } from 'vitest/config';

/**
 * Suite separada de `vitest.config.ts` (la de `npm test`, en el hook de
 * pre-commit): estos tests pegan por HTTP contra un server real ya
 * levantado (ver e2e-api/client.ts y e2e/env.ts) y tardan segundos, no
 * milisegundos. Se corren a mano con `npm run test:e2e-api` o
 * `npm run test:e2e-api:docker`, o en CI (ver `e2e_command` en
 * `.github/workflows/ci.yml`) — nunca en `npm run check`.
 */
export default defineConfig({
  test: {
    include: ['e2e-api/**/*.test.ts'],
    // Un solo worker: todos los archivos pegan contra el mismo server real y
    // el mismo directorio de datos (ver playwright.config.ts, mismo motivo).
    fileParallelism: false,
    reporters: ['default'],
    // Decodificar HEIC real (varias fotos por `beforeAll`) es CPU-intensivo;
    // el default de Vitest (5s test / 10s hook) no alcanza bajo CPU
    // compartida (mismo motivo que el timeout de 120s en playwright.config.ts).
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
