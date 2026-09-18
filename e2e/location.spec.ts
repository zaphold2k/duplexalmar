import { expect, test } from '@playwright/test';

test.describe('sección de ubicación', () => {
  test('el mapa se carga de forma diferida y no bloquea la primera visualización', async ({
    page,
  }) => {
    await page.goto('/ubicacion');

    const map = page.locator('.location__map iframe');
    await expect(map).toHaveAttribute('loading', 'lazy');

    // La página termina de cargar (evento load) sin depender de que el mapa
    // haya terminado de descargarse: si bloqueara, esta espera colgaría.
    await page.waitForLoadState('load', { timeout: 5000 });
  });

  test('ofrece un enlace a una aplicación de mapas externa', async ({ page }) => {
    await page.goto('/ubicacion');

    const link = page.getByRole('link', { name: /abrir la ubicación en el mapa/i });
    await expect(link).toHaveAttribute('href', /google\.com\/maps/);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('el mapa y el enlace externo apuntan a la ficha de las casas, no a la localidad', async ({
    page,
  }) => {
    await page.goto('/ubicacion');

    const placeId = /cid=852154642348760509/;
    await expect(page.locator('.location__map iframe')).toHaveAttribute('src', placeId);
    await expect(
      page.getByRole('link', { name: /abrir la ubicación en el mapa/i }),
    ).toHaveAttribute('href', placeId);
  });

  test('el inicio referencia la ubicación con un enlace a la página dedicada', async ({ page }) => {
    await page.goto('/');

    const link = page.getByRole('link', { name: /ver el mapa y cómo llegar/i });
    await expect(link).toHaveAttribute('href', '/ubicacion');
  });
});
