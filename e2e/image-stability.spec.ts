import { expect, test } from '@playwright/test';

/**
 * Task 5.1: el componente de imagen responsiva declara `width`/`height`, así
 * que el espacio queda reservado y la página no se desplaza mientras cargan
 * las imágenes. Se mide con la Layout Instability API del navegador
 * (`layout-shift`), no comparando posiciones a ojo.
 */
async function cumulativeLayoutShift(page: import('@playwright/test').Page): Promise<number> {
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) {
          (window as unknown as { __cls: number }).__cls += entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.waitForLoadState('networkidle');
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test.describe('estabilidad del layout durante la carga de imágenes', () => {
  test('la página de una casa con galería no acumula desplazamiento de layout', async ({
    page,
  }) => {
    await page.goto('/casa-rosa');

    const cls = await cumulativeLayoutShift(page);

    // Un CLS "bueno" según web.dev es < 0.1; acá se pide bastante menos porque
    // no hay contenido asíncrono más que las imágenes con tamaño declarado.
    expect(cls).toBeLessThan(0.05);
  });
});
