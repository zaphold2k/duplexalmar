import { expect, test } from '@playwright/test';
import { readManifest, setCover, writeManifest } from '../src/server/houses';
import { E2E_DATA_DIR } from './env';

// El estado vacío (manifest sin fotos → imagen de reserva, tareas 5.2/5.3) se
// verifica en global-setup.ts, antes de subir ninguna foto: es el único
// momento en que hay una casa genuinamente vacía para probarlo, porque tanto
// este setup como admin-panel.spec.ts siembran fotos reales en las dos casas
// para el resto de los tests de navegador.

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
    const before = await readManifest(E2E_DATA_DIR, 'casa-rosa');
    const [firstId, secondId] = before.gallery;
    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    if (!firstId || !secondId) return;

    await writeManifest(E2E_DATA_DIR, 'casa-rosa', setCover(before, firstId));
    await page.goto('/casa-rosa');
    const ogImageWithFirstCover = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImageWithFirstCover).toContain(firstId);

    await writeManifest(E2E_DATA_DIR, 'casa-rosa', setCover(before, secondId));
    await page.goto('/casa-rosa');
    const ogImageWithSecondCover = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImageWithSecondCover).toContain(secondId);

    expect(ogImageWithFirstCover).not.toBe(ogImageWithSecondCover);
  });
});
