import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { E2E_DATA_DIR } from '../e2e/env';
import { HOME_HERO_SLUG } from '../src/server/home-hero';
import { readManifest } from '../src/server/houses';
import { apiPost, fileForm, getHtml, login } from './client';

/**
 * Equivalente sin browser de lo que antes cubrían (con `page.setInputFiles`
 * + `Promise.all([page.waitForEvent('load'), click])`) las secciones
 * "subida, reemplazo y publicación" y "eliminación" de
 * `e2e/home-hero.spec.ts`, saltadas ahí por el cuelgue documentado en la
 * memoria "bug-hang-subida-heic-en-ci" (específico del browser que
 * Playwright administra en el runner de GitHub Actions, no de HTTP ni del
 * procesamiento en sí). Sube por POST directo, exactamente el mismo pedido
 * que dispara el JS del panel (ver `location.reload()` en
 * `src/pages/admin/index.astro`), y verifica el resultado con HTML servido
 * de verdad — sin necesitar Playwright ni Chrome.
 */

const SAMPLE_HEIC = path.join(process.cwd(), 'src/server/images/fixtures/sample.heic');

async function heroFiles(): Promise<string[]> {
  try {
    return await readdir(path.join(E2E_DATA_DIR, 'images', HOME_HERO_SLUG));
  } catch {
    return [];
  }
}

/**
 * Astro no garantiza el orden de los atributos que Playwright ignoraba vía
 * locator: se extrae la etiqueta completa (por su `class`) y se busca el id
 * adentro, en vez de asumir que `class` aparece antes que `src` en el HTML.
 */
function extractTag(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  expect(match, `no se encontró ${pattern.source} en el HTML`).not.toBeNull();
  return match?.[0] ?? '';
}

describe('acceso sin sesión', () => {
  it('subir o quitar la foto principal responde 401 y no modifica nada', async () => {
    const upload = await apiPost('/api/admin/inicio/upload', null, new FormData());
    const remove = await apiPost('/api/admin/inicio/delete', null, new FormData());

    expect(upload.status).toBe(401);
    expect(remove.status).toBe(401);
    const manifest = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual([]);
  });
});

describe('sin foto propia', () => {
  it('el inicio muestra la imagen de reserva y el panel lo dice', async () => {
    const homeHtml = await getHtml('/');
    expect(homeHtml).toContain('/images/reserve-cover.jpg');

    const cookie = await login();
    const panelHtml = await getHtml('/admin', cookie);
    expect(panelHtml).toContain('data-home-hero-empty');
  });
});

describe('subida, reemplazo y publicación', () => {
  it('subir una foto desde el panel la publica en el inicio y en la vista previa, sin redeploy', async () => {
    const cookie = await login();
    const buffer = await readFile(SAMPLE_HEIC);
    const response = await apiPost(
      '/api/admin/inicio/upload',
      cookie,
      fileForm('file', 'hero.heic', 'image/heic', buffer),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { result: { status: string; imageId?: string } };
    expect(body.result.status).toBe('uploaded');
    const id = body.result.imageId;
    expect(id).toBeDefined();
    if (!id) return;

    const homeHtml = await getHtml('/');
    const heroTag = extractTag(homeHtml, /<img[^>]*class="hero__image"[^>]*>/);
    expect(heroTag).toContain(id);
    expect(homeHtml).toMatch(new RegExp(`og:image" content="[^"]*/images/${HOME_HERO_SLUG}/${id}`));

    const panelHtml = await getHtml('/admin', cookie);
    expect(panelHtml).not.toContain('data-home-hero-empty');
    expect(panelHtml).toContain(id);
  });

  it('subir otra foto reemplaza la vigente y borra los archivos de la anterior', async () => {
    const before = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    const [previousId] = before.gallery;
    expect(previousId).toBeDefined();
    if (!previousId) return;

    const cookie = await login();
    const buffer = await readFile(SAMPLE_HEIC);
    const response = await apiPost(
      '/api/admin/inicio/upload',
      cookie,
      fileForm('file', 'hero-2.heic', 'image/heic', buffer),
    );
    const body = (await response.json()) as { result: { status: string; imageId?: string } };
    const newId = body.result.imageId;
    expect(newId).toBeDefined();
    if (!newId) return;

    expect(newId).not.toBe(previousId);
    const after = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    expect(after.gallery).toEqual([newId]);
    expect(after.images[previousId]).toBeUndefined();

    const files = await heroFiles();
    expect(files.some((name) => name.startsWith(previousId))).toBe(false);
    expect(files.some((name) => name.startsWith(newId))).toBe(true);
  });

  it('un archivo inválido se rechaza y la foto vigente no cambia', async () => {
    const before = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    const cookie = await login();

    const response = await apiPost(
      '/api/admin/inicio/upload',
      cookie,
      fileForm('file', 'no-es-imagen.txt', 'text/plain', Buffer.from('esto no es una imagen')),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { result: { status: string; reason?: string } };
    expect(body.result.status).toBe('failed');
    expect(body.result.reason).toMatch(/no es una imagen válida/i);

    const after = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    expect(after.gallery).toEqual(before.gallery);
  });
});

describe('eliminación', () => {
  it('quitar la foto con confirmación vuelve a la imagen de reserva, sin dejar huérfanos', async () => {
    const cookie = await login();
    const response = await apiPost('/api/admin/inicio/delete', cookie, new FormData());
    expect(response.ok).toBe(true);

    const manifest = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual([]);
    expect(await heroFiles()).toEqual([]);

    const homeHtml = await getHtml('/');
    expect(homeHtml).toContain('/images/reserve-cover.jpg');
  });

  it('quitar sin foto vigente es idempotente', async () => {
    const cookie = await login();
    const response = await apiPost('/api/admin/inicio/delete', cookie, new FormData());

    expect(response.ok).toBe(true);
    const manifest = await readManifest(E2E_DATA_DIR, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual([]);
  });
});
