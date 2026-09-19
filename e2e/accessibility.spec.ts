import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'prueba-123';

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Usuario').fill(VALID_USERNAME);
  await page.getByLabel('Contraseña').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function auditPage(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe('auditoría de accesibilidad (axe-core)', () => {
  test('inicio: sin incumplimientos de contraste, etiquetado ni orden de encabezados', async ({
    page,
  }) => {
    await page.goto('/');
    await auditPage(page);
  });

  test('página de casa: sin incumplimientos', async ({ page }) => {
    await page.goto('/casa-rosa');
    await auditPage(page);
  });

  test('panel: sin incumplimientos', async ({ page }) => {
    await login(page);
    await page.goto('/admin/casa-verde');
    await auditPage(page);
  });
});
