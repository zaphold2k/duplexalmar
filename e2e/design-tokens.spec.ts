import { expect, test } from '@playwright/test';

/**
 * Verifica en un navegador real (no en jsdom, que no calcula layout) que:
 * - la escala tipográfica en `rem` acompaña un cambio del tamaño de fuente
 *   raíz (tarea 4.2);
 * - el tope al crecimiento del tamaño raíz (tarea 4.3) efectivamente acota
 *   un valor grande y deja pasar uno dentro de rango, simulando lo que
 *   `font: -apple-system-body` produciría con Dynamic Type en iOS, que
 *   Chromium no interpreta.
 */

async function computedFontSizePx(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<number> {
  const value = await page.locator(selector).evaluate((el) => getComputedStyle(el).fontSize);
  return Number.parseFloat(value);
}

/**
 * Simula lo que `font: -apple-system-body` produciría con Dynamic Type en un
 * iPhone real (que Chromium no interpreta): intercepta la respuesta HTML y le
 * inyecta una regla `html { font-size: <px> }` al principio del `<head>`, para
 * que el navegador la aplique —de verdad, vía CSSOM— antes de que corra
 * nuestro script de tope. Interceptar la respuesta es necesario porque
 * `page.addInitScript` corre demasiado temprano: `document.documentElement`
 * todavía no existe en ese punto.
 */
async function gotoWithSimulatedRootFontSize(
  page: import('@playwright/test').Page,
  simulatedPx: number,
): Promise<void> {
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const withOverride = body.replace(
      '<head>',
      `<head><style>html{font-size:${String(simulatedPx)}px}</style>`,
    );
    await route.fulfill({ response, body: withOverride });
  });
  await page.goto('/');
}

test.describe('escala tipográfica', () => {
  test('un elemento en --step-3 escala en proporción al tamaño de fuente raíz', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.id = 'scale-probe';
      probe.style.fontSize = 'var(--step-3)';
      probe.textContent = 'muestra';
      document.body.appendChild(probe);
    });

    const rootSizeBefore = await page
      .locator(':root')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    const probeSizeBefore = await computedFontSizePx(page, '#scale-probe');

    expect(probeSizeBefore).toBeCloseTo(rootSizeBefore * 1.728, 1);

    // Simula un cambio del tamaño de fuente raíz (como lo haría Dynamic Type
    // dentro del rango que nuestro propio tope permite, 16–28px).
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '22px';
    });

    const probeSizeAfter = await computedFontSizePx(page, '#scale-probe');
    expect(probeSizeAfter).toBeCloseTo(22 * 1.728, 1);
    expect(probeSizeAfter).not.toBeCloseTo(probeSizeBefore, 1);
  });
});

test.describe('tope al tamaño de fuente raíz', () => {
  test('un tamaño simulado por encima del tope queda acotado a 28px', async ({ page }) => {
    await gotoWithSimulatedRootFontSize(page, 53);

    const rootFontSize = await page
      .locator(':root')
      .evaluate((el) => getComputedStyle(el).fontSize);

    expect(rootFontSize).toBe('28px');
  });

  test('un tamaño simulado por debajo del piso queda acotado a 16px', async ({ page }) => {
    await gotoWithSimulatedRootFontSize(page, 10);

    const rootFontSize = await page
      .locator(':root')
      .evaluate((el) => getComputedStyle(el).fontSize);

    expect(rootFontSize).toBe('16px');
  });

  test('un tamaño simulado dentro de rango no se modifica', async ({ page }) => {
    await gotoWithSimulatedRootFontSize(page, 20);

    const rootFontSize = await page
      .locator(':root')
      .evaluate((el) => getComputedStyle(el).fontSize);

    expect(rootFontSize).toBe('20px');
  });
});
