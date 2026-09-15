import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de navegador real: cubren lo que un test de layout con jsdom no puede
 * (cálculo real de layout, `scrollWidth`, escalado de `rem` frente a un
 * `font-size` raíz). Separados de `npm run check`: arrancan un servidor y un
 * navegador, así que no corren en el hook de pre-commit; se ejecutan a mano
 * con `npm run test:e2e` o en CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Un solo worker: todos los tests comparten un único server real (mismo
  // `/data`, mismo limitador de login en memoria por IP). Correrlos en
  // paralelo entre archivos hacía flakiness cruzada (p. ej. un fallo de
  // login de un archivo demorando el login correcto de otro).
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `astro dev` se demoniza solo en este entorno (detecta un agente de IA y
    // corre en segundo plano), lo que confunde el manejo de procesos de
    // Playwright. Se usa el server de producción en foreground en su lugar:
    // más fiel a lo real, y `--env-file` reemplaza la carga de `.env` que en
    // producción no ocurre sola (ver server/config).
    command: 'npm run build && node --env-file=.env dist/server/entry.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
