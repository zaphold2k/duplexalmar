import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de navegador real: cubren lo que un test de layout con jsdom no puede
 * (cálculo real de layout, `scrollWidth`, escalado de `rem` frente a un
 * `font-size` raíz). Separados de `npm run check`: arrancan un servidor y un
 * navegador, así que no corren en el hook de pre-commit; se ejecutan a mano
 * con `npm run test:e2e` o en CI.
 */
// Con E2E_BASE_URL definida (p. ej. desde `npm run test:e2e:docker`), la
// suite corre contra un server que ya está levantado en esa URL y no arranca
// ninguno propio. Ver e2e/env.ts.
const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Default de Playwright (30s) queda ajustado para los tests que suben un
  // HEIC real y esperan el reload del servidor: decodificar y generar las
  // variantes es CPU-intensivo, y en el runner de CI (CPU compartida, toda
  // la suite en un solo worker) puede tardar bastante más que en una
  // máquina de desarrollo (4-5s local). 60s no alcanzó en la corrida real
  // (timeout clavado en las 3 reintentos); se sube a 120s.
  timeout: 120_000,
  // Un solo worker: todos los tests comparten un único server real (mismo
  // `/data`, mismo limitador de login en memoria por IP). Correrlos en
  // paralelo entre archivos hacía flakiness cruzada (p. ej. un fallo de
  // login de un archivo demorando el login correcto de otro).
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: externalBaseUrl ?? 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Sin server propio (lista vacía) cuando la suite apunta a uno externo.
  webServer: externalBaseUrl
    ? []
    : {
        // `astro dev` se demoniza solo en este entorno (detecta un agente de
        // IA y corre en segundo plano), lo que confunde el manejo de procesos
        // de Playwright. Se usa el server de producción en foreground en su
        // lugar: más fiel a lo real, y `--env-file` reemplaza la carga de
        // `.env` que en producción no ocurre sola (ver server/config).
        command: 'npm run build && node --env-file=.env dist/server/entry.mjs',
        url: 'http://localhost:4321',
        // Directorio de datos exclusivo de la suite (ver e2e/env.ts). Una
        // variable ya presente en el entorno le gana a la del `--env-file`,
        // así que el `DATA_DIR=./data` de `.env` no se usa acá.
        env: { DATA_DIR: './data-e2e' },
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
