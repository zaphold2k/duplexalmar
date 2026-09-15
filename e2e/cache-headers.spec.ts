import path from 'node:path';
import { expect, test } from '@playwright/test';
import { readManifest } from '../src/server/houses';

test.describe('encabezados de caché', () => {
  test('el HTML no lleva caché compartida de larga duración', async ({ request }) => {
    const response = await request.get('/casa-rosa');

    expect(response.headers()['cache-control']).toBe('no-cache');
  });

  test('las imágenes bajo /images/ llevan caché pública inmutable de un año', async ({
    request,
  }) => {
    const dataDir = path.join(process.cwd(), 'data');
    const manifest = await readManifest(dataDir, 'casa-rosa');
    const firstId = manifest.gallery[0];
    expect(firstId).toBeDefined();
    if (!firstId) return;

    const response = await request.get(`/images/casa-rosa/${firstId}-480.webp`);

    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  });
});
