import { expect, test } from '@playwright/test';

test.describe('slug de casa inexistente', () => {
  test('responde 404 con una página de error que ofrece volver al inicio', async ({ page }) => {
    const response = await page.goto('/casa-inexistente');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const homeLink = page.getByRole('link', { name: /volver al inicio/i });
    await expect(homeLink).toHaveAttribute('href', '/');
  });
});
