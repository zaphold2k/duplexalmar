import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { HOME_HERO_SLUG } from '../src/server/home-hero';
import { readManifest } from '../src/server/houses';
import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME, E2E_BASE_URL, E2E_DATA_DIR } from './env';

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

async function heroFiles(): Promise<string[]> {
  try {
    return await readdir(path.join(DATA_DIR, 'images', HOME_HERO_SLUG));
  } catch {
    return [];
  }
}

async function uploadHeroFromPanel(page: Page): Promise<string> {
  await page.setInputFiles('[data-home-hero-form] input[type="file"]', SAMPLE_HEIC);
  // La página se recarga sola cuando la subida termina (procesar un HEIC
  // real tarda unos segundos).
  await Promise.all([
    page.waitForEvent('load', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Subir foto principal' }).click(),
  ]);
  const manifest = await readManifest(DATA_DIR, HOME_HERO_SLUG);
  const [id] = manifest.gallery;
  expect(id).toBeDefined();
  return id ?? '';
}

// Todo el archivo comparte el estado de la foto principal en el mismo /data
// del server real, así que va en orden: primero sin foto, después con una.
test.describe.configure({ mode: 'serial' });

test.describe('acceso sin sesión', () => {
  test('subir o quitar la foto principal responde 401 y no modifica nada', async ({
    request,
    baseURL,
  }) => {
    const origin = baseURL ?? E2E_BASE_URL;

    const upload = await request.post('/api/admin/inicio/upload', { headers: { origin } });
    const remove = await request.post('/api/admin/inicio/delete', { headers: { origin } });

    expect(upload.status()).toBe(401);
    expect(remove.status()).toBe(401);
    const manifest = await readManifest(DATA_DIR, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual([]);
  });
});

test.describe('sin foto propia', () => {
  test('el inicio muestra la imagen de reserva y el panel lo dice', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__image')).toHaveAttribute('src', '/images/reserve-cover.jpg');

    await login(page);
    await expect(page.locator('[data-home-hero-empty]')).toBeVisible();
    await expect(page.locator('[data-home-hero] img')).toHaveCount(0);
  });
});

test.describe('subida, reemplazo y publicación', () => {
  test('subir una foto desde el panel la publica en el inicio y en la vista previa, sin redeploy', async ({
    page,
  }) => {
    await login(page);
    const id = await uploadHeroFromPanel(page);

    await expect(page.locator('[data-home-hero] img')).toHaveAttribute('src', new RegExp(id));
    await expect(page.locator('[data-home-hero-empty]')).toHaveCount(0);

    await page.goto('/');
    await expect(page.locator('.hero__image')).toHaveAttribute('src', new RegExp(id));
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toContain(`/images/${HOME_HERO_SLUG}/${id}`);
  });

  test('en pantalla grande la foto de inicio ocupa todo el ancho', async ({ page }) => {
    // La foto la sembró el test anterior (un solo worker, en orden). Más
    // ancha que la variante mayor de la imagen, la pantalla expone si el
    // estilo de la página no llega al <img> (quedaba a su ancho intrínseco,
    // pegada a la izquierda).
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

  test('subir otra foto reemplaza la vigente y borra los archivos de la anterior', async ({
    page,
  }) => {
    const before = await readManifest(DATA_DIR, HOME_HERO_SLUG);
    const [previousId] = before.gallery;
    expect(previousId).toBeDefined();
    if (!previousId) return;

    await login(page);
    const newId = await uploadHeroFromPanel(page);

    expect(newId).not.toBe(previousId);
    const after = await readManifest(DATA_DIR, HOME_HERO_SLUG);
    expect(after.gallery).toEqual([newId]);
    expect(after.images[previousId]).toBeUndefined();

    const files = await heroFiles();
    expect(files.some((name) => name.startsWith(previousId))).toBe(false);
    expect(files.some((name) => name.startsWith(newId))).toBe(true);
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

test.describe('eliminación', () => {
  test('quitar la foto con confirmación vuelve a la imagen de reserva, sin dejar huérfanos', async ({
    page,
  }) => {
    await login(page);

    page.once('dialog', (dialog) => void dialog.accept());
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Quitar foto principal' }).click(),
    ]);

    await expect(page.locator('[data-home-hero-empty]')).toBeVisible();
    const manifest = await readManifest(DATA_DIR, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual([]);
    expect(await heroFiles()).toEqual([]);

    await page.goto('/');
    await expect(page.locator('.hero__image')).toHaveAttribute('src', '/images/reserve-cover.jpg');
  });

  test('quitar sin foto vigente es idempotente', async ({ page, baseURL }) => {
    await login(page);

    const response = await page.request.post('/api/admin/inicio/delete', {
      headers: { origin: baseURL ?? E2E_BASE_URL },
    });

    expect(response.ok()).toBe(true);
    const manifest = await readManifest(DATA_DIR, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual([]);
  });
});
