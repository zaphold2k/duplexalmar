import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serveImageFile } from './serve-file';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'duplexalmar-serve-file-'));
  await mkdir(path.join(dataDir, 'images', 'casa-rosa'), { recursive: true });
  await writeFile(
    path.join(dataDir, 'images', 'casa-rosa', 'abc-480.webp'),
    Buffer.from('webp bytes'),
  );
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe('serveImageFile', () => {
  it('sirve un archivo existente con caché inmutable de un año', async () => {
    const response = await serveImageFile(dataDir, 'casa-rosa', 'abc-480.webp');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await response.text()).toBe('webp bytes');
  });

  it('responde 404 para un archivo que no existe', async () => {
    const response = await serveImageFile(dataDir, 'casa-rosa', 'no-existe-900.webp');

    expect(response.status).toBe(404);
  });

  it('responde 404 sin parámetros', async () => {
    expect((await serveImageFile(dataDir, undefined, 'abc-480.webp')).status).toBe(404);
    expect((await serveImageFile(dataDir, 'casa-rosa', undefined)).status).toBe(404);
  });

  it('responde 404 ante un intento de path traversal en cualquiera de los dos segmentos', async () => {
    expect((await serveImageFile(dataDir, '..', 'abc-480.webp')).status).toBe(404);
    expect((await serveImageFile(dataDir, 'casa-rosa', '../../etc/passwd')).status).toBe(404);
    expect((await serveImageFile(dataDir, 'casa-rosa/../casa-verde', 'abc-480.webp')).status).toBe(
      404,
    );
  });
});
