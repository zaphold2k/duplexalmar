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

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

const publicPages = ['/', '/casa-rosa', '/casa-verde', '/ubicacion'];

test.describe('320px de ancho (mobile)', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  for (const path of publicPages) {
    test(`${path}: sin desplazamiento horizontal`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    });
  }

  test('/admin/login: sin desplazamiento horizontal', async ({ page }) => {
    await page.goto('/admin/login');
    await expectNoHorizontalScroll(page);
  });

  test('/admin/casa-verde: sin desplazamiento horizontal', async ({ page }) => {
    await login(page);
    await page.goto('/admin/casa-verde');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('200% de zoom del navegador (viewport equivalente reducido a la mitad)', () => {
  // Duplicar el zoom en una pantalla de 1280px deja, en términos de layout,
  // el mismo espacio que una pantalla de 640px sin zoom.
  test.use({ viewport: { width: 640, height: 800 } });

  for (const path of publicPages) {
    test(`${path}: sin pérdida de contenido ni desplazamiento horizontal`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
      await expect(page.locator('h1')).toBeVisible();
    });
  }
});
