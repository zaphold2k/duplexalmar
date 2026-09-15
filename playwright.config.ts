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
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
