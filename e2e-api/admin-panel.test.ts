import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { E2E_DATA_DIR } from '../e2e/env';
import { processUploadBatch } from '../src/server/images';
import { readManifest } from '../src/server/houses';
import { apiPost, getHtml, login } from './client';

/**
 * Equivalente sin browser de las secciones "portada", "reordenamiento",
 * "texto alternativo" y "eliminación" de `e2e/admin-panel.spec.ts`. Todas
 * disparaban, del lado del panel, un `location.reload()` tras el fetch (ver
 * `src/pages/admin/[house].astro`) esperado con `Promise.all([
 * page.waitForEvent('load'), click])` — el patrón que cuelga en el runner de
 * GitHub Actions (memoria "bug-hang-subida-heic-en-ci"; confirmado de nuevo
 * en la corrida 35490650180: "reordenamiento › mover una foto" cortó exacto
 * en `Test timeout of 120000ms exceeded` esperando el evento `load`, y el
 * reintento en serie infló `casa-verde` de 4 a 12 fotos). Acá se dispara el
 * mismo POST que ese JS y se verifica con HTML servido de verdad, sin
 * navegador de por medio.
 */

const HOUSE = 'casa-verde';

let seededImageIds: string[] = [];

beforeAll(async () => {
  const buffer = await readFile(path.join(process.cwd(), 'src/server/images/fixtures/sample.heic'));
  const results = await processUploadBatch(E2E_DATA_DIR, HOUSE, [
    { clientFileName: 'verde-1.heic', buffer },
    { clientFileName: 'verde-2.heic', buffer },
    { clientFileName: 'verde-3.heic', buffer },
    { clientFileName: 'verde-4.heic', buffer },
  ]);
  seededImageIds = results.flatMap((r) => (r.status === 'uploaded' ? [r.imageId] : []));
  expect(seededImageIds).toHaveLength(4);
});

// `[^>]*` antes del `>` de cierre: Astro le agrega un atributo
// `data-astro-cid-*` a los elementos con estilos scoped, después de los que
// declara el componente (ver `<li class="thumb" data-image-id={image.id}>`
// en admin/[house].astro, que en el HTML servido sale con ese atributo
// extra pegado al final).
function extractThumb(html: string, imageId: string): string {
  const match = new RegExp(
    `<li class="thumb" data-image-id="${imageId}"[^>]*>[\\s\\S]*?</li>`,
  ).exec(html);
  expect(match, `no se encontró el thumb de ${imageId}`).not.toBeNull();
  return match?.[0] ?? '';
}

function firstGalleryItem(html: string): string {
  const gallery = /<ul class="gallery__grid"[^>]*>([\s\S]*?)<\/ul>/.exec(html);
  expect(gallery, 'no se encontró la grilla de la galería pública').not.toBeNull();
  const firstLi = gallery?.[1] === undefined ? null : /<li[^>]*>[\s\S]*?<\/li>/.exec(gallery[1]);
  expect(firstLi, 'la galería pública no tiene ningún <li>').not.toBeNull();
  return firstLi?.[0] ?? '';
}

describe('portada', () => {
  it('designar portada desde el panel se refleja en el sitio público sin redesplegar', async () => {
    const cookie = await login();
    const targetId = seededImageIds[2];
    expect(targetId).toBeDefined();
    if (!targetId) return;

    const form = new FormData();
    form.set('imageId', targetId);
    const response = await apiPost(`/api/admin/${HOUSE}/cover`, cookie, form);
    expect(response.ok).toBe(true);

    const panelHtml = await getHtml(`/admin/${HOUSE}`, cookie);
    expect(extractThumb(panelHtml, targetId)).toContain('thumb__badge');

    const publicHtml = await getHtml(`/${HOUSE}`);
    expect(publicHtml).toMatch(new RegExp(`og:image" content="[^"]*${targetId}`));
  });
});

describe('reordenamiento', () => {
  it('mover una foto persiste el nuevo orden y se refleja en el sitio público', async () => {
    const cookie = await login();
    const before = await readManifest(E2E_DATA_DIR, HOUSE);
    const secondId = before.gallery[1];
    expect(secondId).toBeDefined();
    if (!secondId) return;

    const form = new FormData();
    form.set('imageId', secondId);
    form.set('direction', 'forward');
    const response = await apiPost(`/api/admin/${HOUSE}/move`, cookie, form);
    expect(response.ok).toBe(true);

    const after = await readManifest(E2E_DATA_DIR, HOUSE);
    expect(after.gallery[0]).toBe(secondId);
    expect(after.gallery[1]).toBe(before.gallery[0]);

    const publicHtml = await getHtml(`/${HOUSE}`);
    expect(firstGalleryItem(publicHtml)).toContain(secondId);
  });
});

describe('texto alternativo', () => {
  it('editar el texto alternativo lo publica en el sitio público', async () => {
    const cookie = await login();
    const targetId = seededImageIds[0];
    expect(targetId).toBeDefined();
    if (!targetId) return;

    const altText = 'Vista al mar desde el balcón de la Casa Verde';
    const form = new FormData();
    form.set('imageId', targetId);
    form.set('alt', altText);
    const response = await apiPost(`/api/admin/${HOUSE}/alt`, cookie, form);
    expect(response.ok).toBe(true);

    const publicHtml = await getHtml(`/${HOUSE}`);
    expect(publicHtml).toContain(`aria-label="Ampliar foto`);
    expect(publicHtml).toContain(altText);
  });
});

describe('eliminación', () => {
  it('eliminar una foto la quita del manifest y borra sus archivos, sin dejar huérfanos', async () => {
    const cookie = await login();
    const targetId = seededImageIds[3];
    expect(targetId).toBeDefined();
    if (!targetId) return;

    const form = new FormData();
    form.set('imageId', targetId);
    const response = await apiPost(`/api/admin/${HOUSE}/delete`, cookie, form);
    expect(response.ok).toBe(true);

    const panelHtml = await getHtml(`/admin/${HOUSE}`, cookie);
    expect(panelHtml).not.toContain(`data-image-id="${targetId}"`);

    const manifest = await readManifest(E2E_DATA_DIR, HOUSE);
    expect(manifest.gallery).not.toContain(targetId);
    expect(manifest.images[targetId]).toBeUndefined();

    const files = await readdir(path.join(E2E_DATA_DIR, 'images', HOUSE));
    expect(files.some((name) => name.startsWith(targetId))).toBe(false);
  });
});
