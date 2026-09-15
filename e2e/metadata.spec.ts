import path from 'node:path';
import { expect, test } from '@playwright/test';
import { readManifest, setCover, writeManifest } from '../src/server/houses';

test.describe('estado vacío', () => {
  test('la home renderiza con el manifest vacío mostrando la imagen de reserva', async ({
    page,
  }) => {
    // casa-verde no recibe fotos en el global-setup: queda con la galería vacía.
    await page.goto('/');

    const verdeCard = page.locator('.house-card', { hasText: 'Casa Verde' });
    await expect(verdeCard.locator('img')).toHaveAttribute('src', '/images/reserve-cover.jpg');
  });

  test('la página de una casa sin fotos muestra la imagen de reserva en la portada', async ({
    page,
  }) => {
    await page.goto('/casa-verde');

    const hero = page.locator('.house-hero__image');
    await expect(hero).toHaveAttribute('src', '/images/reserve-cover.jpg');
  });
});

test.describe('metadatos y vista previa social', () => {
  test('cada página declara título, descripción e imagen de vista previa', async ({ page }) => {
    await page.goto('/casa-rosa');

    await expect(page).toHaveTitle(/Casa Rosa/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/);
  });

  test('cambiar la portada de una casa cambia la imagen declarada en la vista previa', async ({
    page,
  }) => {
    const dataDir = path.join(process.cwd(), 'data');
    const before = await readManifest(dataDir, 'casa-rosa');
    const [firstId, secondId] = before.gallery;
    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    if (!firstId || !secondId) return;

    await writeManifest(dataDir, 'casa-rosa', setCover(before, firstId));
    await page.goto('/casa-rosa');
    const ogImageWithFirstCover = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImageWithFirstCover).toContain(firstId);

    await writeManifest(dataDir, 'casa-rosa', setCover(before, secondId));
    await page.goto('/casa-rosa');
    const ogImageWithSecondCover = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImageWithSecondCover).toContain(secondId);

    expect(ogImageWithFirstCover).not.toBe(ogImageWithSecondCover);
  });
});
