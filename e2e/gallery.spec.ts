import { expect, test } from '@playwright/test';

test.describe('galería — vista ampliada', () => {
  test('las flechas de teclado navegan, escape cierra y el foco vuelve al origen', async ({
    page,
  }) => {
    await page.goto('/casa-rosa');

    const thumbs = page.locator('[data-lightbox-trigger]');
    await expect(thumbs).toHaveCount(3);

    const firstThumb = thumbs.nth(0);
    await firstThumb.click();

    const dialog = page.locator('.gallery__dialog');
    await expect(dialog).toBeVisible();
    const lightboxImage = dialog.locator('.gallery__image');
    const srcAfterOpen = await lightboxImage.getAttribute('src');

    await page.keyboard.press('ArrowRight');
    const srcAfterNext = await lightboxImage.getAttribute('src');
    expect(srcAfterNext).not.toBe(srcAfterOpen);

    await page.keyboard.press('ArrowLeft');
    const srcAfterPrev = await lightboxImage.getAttribute('src');
    expect(srcAfterPrev).toBe(srcAfterOpen);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstThumb).toBeFocused();
  });

  test('en pantalla grande la foto ampliada aprovecha la pantalla sin deformarse', async ({
    page,
  }) => {
    const viewport = { width: 1440, height: 900 };
    await page.setViewportSize(viewport);
    await page.goto('/casa-rosa');
    await page.locator('[data-lightbox-trigger]').first().click();

    const image = page.locator('.gallery__dialog .gallery__image');
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    // La caja del <img> se extiende a la pantalla (antes quedaba al ancho de
    // la variante mayor); la foto se pinta adentro con `object-fit: contain`,
    // así que la proporción es la del archivo, no la de la caja.
    const box = await image.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(viewport.width * 0.9);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(viewport.height * 0.6);

    const fit = await image.evaluate((img: HTMLImageElement) => getComputedStyle(img).objectFit);
    expect(fit).toBe('contain');
  });
});
