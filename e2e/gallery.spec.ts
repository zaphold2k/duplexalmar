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
});
