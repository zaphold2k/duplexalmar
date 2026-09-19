import { expect, test } from '@playwright/test';

test.describe('navegación desde la página de una casa', () => {
  test('el enlace "Volver al inicio" está visible sobre la portada y lleva a la raíz', async ({
    page,
  }) => {
    await page.goto('/casa-verde');

    const back = page.getByRole('link', { name: 'Volver al inicio' });
    await expect(back).toBeVisible();
    await expect(back).toBeInViewport();
    await expect(back).toHaveAttribute('href', '/');

    await back.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
