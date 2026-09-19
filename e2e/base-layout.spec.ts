import { expect, test } from '@playwright/test';

test.describe('layout base', () => {
  test('la meta etiqueta de viewport no restringe el zoom', async ({ page }) => {
    await page.goto('/');

    const content = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(content).toContain('width=device-width');
    expect(content).not.toMatch(/maximum-scale/i);
    expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
  });

  test('la página no se desplaza horizontalmente a 320 píxeles de ancho', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
