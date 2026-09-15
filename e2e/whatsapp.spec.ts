import { expect, test } from '@playwright/test';

test.describe('acceso a WhatsApp', () => {
  test('desde la página de una casa, el mensaje menciona esa casa', async ({ page }) => {
    await page.goto('/casa-verde');

    const links = page.locator('a[href*="wa.me"]');
    await expect(links.first()).toHaveAttribute('href', /Casa%20Verde|Casa\+Verde/i);
  });

  test('desde el inicio, el mensaje es genérico y no menciona una casa en particular', async ({
    page,
  }) => {
    await page.goto('/');

    const link = page.locator('a[href*="wa.me"]').first();
    const href = await link.getAttribute('href');

    expect(href).not.toBeNull();
    expect(decodeURIComponent(href ?? '')).not.toMatch(/casa rosa|casa verde/i);
  });

  test('en la página de una casa, el acceso a WhatsApp queda visible de forma permanente', async ({
    page,
  }) => {
    await page.goto('/casa-rosa');

    const sticky = page.locator('.whatsapp-button--sticky');
    await expect(sticky).toBeVisible();

    await page.mouse.wheel(0, 2000);
    await expect(sticky).toBeInViewport();
  });
});
