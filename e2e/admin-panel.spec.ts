import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { processUploadBatch } from '../src/server/images';
import { EMPTY_MANIFEST, writeManifest } from '../src/server/houses';
import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME, E2E_DATA_DIR } from './env';

const VALID_USERNAME = E2E_ADMIN_USERNAME;
const VALID_PASSWORD = E2E_ADMIN_PASSWORD;

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Usuario').fill(VALID_USERNAME);
  await page.getByLabel('Contraseña').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

// casa-verde es del panel: casa-rosa la usan otros archivos (gallery,
// metadata, whatsapp) esperando sus 3 fotos del global-setup sin cambios.
// Cada test de acá sube las suyas o reutiliza las de este beforeAll, todo
// serializado en un solo worker (ver playwright.config.ts).
let seededImageIds: string[] = [];

test.beforeAll(async () => {
  // Idempotente ante reintentos: en modo serie, si un test más abajo en el
  // archivo falla, Playwright reintenta corriendo TODO el archivo de nuevo
  // desde el principio, `beforeAll` incluido — sin este reset, cada
  // reintento vuelve a sembrar 4 fotos más sobre las que ya había (4 → 8 →
  // 12 en una corrida real), y eso vuelve flaky a cualquier otro test que
  // cuente fotos de casa-verde (ver memoria "bug-hang-subida-heic-en-ci").
  await writeManifest(E2E_DATA_DIR, 'casa-verde', EMPTY_MANIFEST);
  await rm(path.join(E2E_DATA_DIR, 'images', 'casa-verde'), { recursive: true, force: true });

  const buffer = await readFile(path.join(process.cwd(), 'src/server/images/fixtures/sample.heic'));
  const results = await processUploadBatch(E2E_DATA_DIR, 'casa-verde', [
    { clientFileName: 'verde-1.heic', buffer },
    { clientFileName: 'verde-2.heic', buffer },
    { clientFileName: 'verde-3.heic', buffer },
    { clientFileName: 'verde-4.heic', buffer },
  ]);
  seededImageIds = results.flatMap((r) => (r.status === 'uploaded' ? [r.imageId] : []));
  expect(seededImageIds).toHaveLength(4);
});

test.describe.configure({ mode: 'serial' });

// "portada", "reordenamiento", "texto alternativo" (editar) y "eliminación"
// vivían acá con `Promise.all([page.waitForEvent('load'), click])`, esperando
// el `location.reload()` que dispara el JS del panel (ver
// src/pages/admin/[house].astro) tras cada acción. Ese patrón cuelga
// específicamente en el runner de GitHub Actions (memoria
// "bug-hang-subida-heic-en-ci"; la corrida 35490650180 lo confirmó de nuevo:
// "reordenamiento › mover una foto" cortó exacto en `Test timeout of
// 120000ms exceeded` esperando el evento `load`, y el reintento en serie
// terminó inflando casa-verde de 4 a 12 fotos, volviendo flaky a la galería
// de acá). Esas cuatro acciones ahora se verifican por HTTP directo, sin
// browser, en e2e-api/admin-panel.test.ts. Lo que queda acá no dispara ese
// reload: selección de casa, lectura de la galería, 404 y el lote de subida
// (que sólo hace fetch + repinta el resumen en el propio DOM).

test.describe('selección de casa y galería', () => {
  test('la selección de casa ofrece las dos casas', async ({ page }) => {
    await login(page);

    await expect(page.getByRole('link', { name: 'Casa Rosa' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Casa Verde' })).toBeVisible();
  });

  test('la galería de casa-verde refleja el manifest, con la portada indicada', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/casa-verde');

    const thumbs = page.locator('.thumb');
    await expect(thumbs).toHaveCount(4);
    // Ninguna portada explícita todavía: la primera de la galería es la efectiva.
    await expect(thumbs.first().locator('.thumb__badge')).toHaveText('Portada');
  });

  test('un slug de casa inválido responde 404 en el panel', async ({ page }) => {
    // El caso de galería vacía ("(vacía)") se verifica en global-setup.ts,
    // el único momento en que casa-verde todavía no tiene fotos.
    await login(page);
    const response = await page.goto('/admin/casa-inexistente');

    expect(response?.status()).toBe(404);
  });
});

test.describe('texto alternativo', () => {
  test('una imagen sin texto alternativo usa el de reserva en el sitio público', async ({
    page,
  }) => {
    await page.goto('/casa-verde');

    // El alt real de cada foto de la galería vive en el aria-label del botón
    // que la abre en el lightbox (la miniatura en sí es decorativa a
    // propósito, ver Gallery.astro). Las que no tienen alt propio exponen un
    // texto de reserva que menciona la casa, nunca uno vacío.
    const triggers = page.locator('[data-lightbox-trigger]');
    const count = await triggers.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const label = await triggers.nth(i).getAttribute('aria-label');
      expect(label).not.toBeNull();
      expect(label?.trim().endsWith(':')).toBe(false);
      expect(label).toContain('Foto de Casa Verde');
    }
  });
});

test.describe('subida', () => {
  test('un lote mixto (una foto inválida) informa cargadas y fallidas por separado', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/casa-verde');

    const validPath = path.join(process.cwd(), 'src/server/images/fixtures/sample.heic');
    const invalidPath = path.join(process.cwd(), 'e2e', 'fixtures', 'not-an-image.txt');

    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(path.dirname(invalidPath), { recursive: true });
    await writeFile(invalidPath, 'esto no es una imagen');

    await page.setInputFiles('input[type="file"]', [validPath, invalidPath]);
    await page.getByRole('button', { name: 'Subir' }).click();

    // El resumen se arma de una sola vez cuando responde el XHR (ver
    // admin/[house].astro): no hay estado intermedio entre el `toHaveCount`
    // y los `filter` de abajo, pero decodificar el HEIC real bajo CPU
    // compartida en CI puede tardar más que el default de Playwright
    // (mismo motivo que el timeout de 120s en playwright.config.ts).
    const summary = page.locator('[data-upload-summary] li');
    await expect(summary).toHaveCount(2, { timeout: 30_000 });
    // eslint-disable-next-line no-console -- diagnóstico temporal, ver memoria del cuelgue de e2e
    console.log('resumen de subida:', await summary.allTextContents());
    await expect(summary.filter({ hasText: 'sample.heic: cargada' })).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(summary.filter({ hasText: 'not-an-image.txt' })).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(summary.filter({ hasText: 'not-an-image.txt' })).toContainText(
      'no es una imagen válida',
    );
  });
});
