import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { HOME_HERO_SLUG, replaceHomeHeroImage } from '../src/server/home-hero';
import { readManifest } from '../src/server/houses';
import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME, E2E_DATA_DIR } from './env';

const VALID_USERNAME = E2E_ADMIN_USERNAME;
const VALID_PASSWORD = E2E_ADMIN_PASSWORD;
const DATA_DIR = E2E_DATA_DIR;
const SAMPLE_HEIC = path.join(process.cwd(), 'src/server/images/fixtures/sample.heic');

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Usuario').fill(VALID_USERNAME);
  await page.getByLabel('Contraseña').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

// Todo el archivo comparte el estado de la foto principal en el mismo /data
// del server real, así que va en orden: primero sin foto, después con una.
test.describe.configure({ mode: 'serial' });

// Lo que cubrían acá "acceso sin sesión" (401 del API) y "subida, reemplazo y
// publicación"/"eliminación" (publicar/reemplazar/borrar la foto principal
// sin redeploy) ahora vive en e2e-api/home-hero.test.ts: son pedidos HTTP
// directos, sin necesitar Chrome ni Playwright. Las movió el bug de
// `page.waitForEvent('load')` tras `location.reload()` colgando en el
// runner de GitHub Actions (memoria "bug-hang-subida-heic-en-ci"; confirmado
// de nuevo el 2026-09-20 en la corrida 35490650180, esta vez en el
// equivalente de admin-panel.spec.ts). Lo que queda acá es lo que sí
// necesita un browser real: layout (viewport, tamaño de controles) y que el
// JS del panel muestre el mensaje de error inline.

test.describe('sin foto propia', () => {
  test('el inicio muestra la imagen de reserva y el panel lo dice', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__image')).toHaveAttribute('src', '/images/reserve-cover.jpg');

    await login(page);
    await expect(page.locator('[data-home-hero-empty]')).toBeVisible();
    await expect(page.locator('[data-home-hero] img')).toHaveCount(0);
  });
});

test.describe('con foto propia, layout', () => {
  test.beforeAll(async () => {
    const buffer = await readFile(SAMPLE_HEIC);
    const result = await replaceHomeHeroImage(DATA_DIR, {
      clientFileName: 'hero.heic',
      buffer,
    });
    expect(result.status).toBe('uploaded');
  });

  test('en pantalla grande la foto de inicio ocupa todo el ancho', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const hero = page.locator('.hero__image');
    await expect(hero).toHaveAttribute('src', new RegExp(`/images/${HOME_HERO_SLUG}/`));
    const box = await hero.boundingBox();
    expect(box?.x).toBe(0);
    expect(box?.width).toBe(1440);
  });

  test('la foto de inicio ocupa el 65% del alto de la ventana y deja ver el contenido', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const box = await page.locator('.hero__image').boundingBox();
      expect(box?.height, `alto a ${String(viewport.width)}px`).toBeCloseTo(
        viewport.height * 0.65,
        0,
      );
      await expect(page.locator('main p').first()).toBeInViewport();
    }
  });

  test('un archivo inválido se rechaza con un mensaje y la foto vigente no cambia', async ({
    page,
  }) => {
    const before = await readManifest(DATA_DIR, HOME_HERO_SLUG);

    await login(page);
    await page.setInputFiles('[data-home-hero-form] input[type="file"]', {
      name: 'no-es-imagen.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('esto no es una imagen'),
    });
    await page.getByRole('button', { name: 'Subir foto principal' }).click();

    await expect(page.locator('[data-home-hero-result]')).toContainText('no es una imagen válida');
    const after = await readManifest(DATA_DIR, HOME_HERO_SLUG);
    expect(after.gallery).toEqual(before.gallery);
  });

  test('los controles de la sección miden al menos 44×44px CSS', async ({ page }) => {
    await login(page);

    const controls = page.locator('[data-home-hero] button, [data-home-hero] input');
    const count = await controls.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i += 1) {
      const box = await controls.nth(i).boundingBox();
      expect(box, `control ${String(i)} sin caja`).not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
