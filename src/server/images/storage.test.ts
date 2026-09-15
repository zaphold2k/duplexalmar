import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveProcessedImage } from './storage';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'duplexalmar-storage-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe('saveProcessedImage', () => {
  it('escribe el original y las variantes bajo /data/images/<casa>/ usando sólo el id del servidor', async () => {
    const id = '01J9F2K8QXSERVERID';

    await saveProcessedImage(dataDir, 'casa-rosa', id, Buffer.from('original bytes'), 'jpeg', {
      width: 1200,
      height: 800,
      variants: [
        { width: 480, buffer: Buffer.from('variant 480') },
        { width: 900, buffer: Buffer.from('variant 900') },
      ],
    });

    const files = await readdir(path.join(dataDir, 'images', 'casa-rosa'));

    expect(files.sort()).toEqual([`${id}-480.webp`, `${id}-900.webp`, `${id}.orig.jpg`]);
  });

  it('el nombre de archivo que hubiera enviado el cliente no influye en la ruta escrita', async () => {
    // El nombre del cliente (p. ej. "../../../etc/passwd" o "foto.jpg") nunca
    // llega a este módulo: la función no lo acepta como parámetro, así que la
    // ruta escrita depende únicamente del id que genera el servidor.
    const uploadsToSimulate = 3;

    for (let index = 0; index < uploadsToSimulate; index += 1) {
      const id = `server-generated-id-${String(index)}`;
      await saveProcessedImage(dataDir, 'casa-verde', id, Buffer.from('bytes'), 'png', {
        width: 480,
        height: 320,
        variants: [{ width: 480, buffer: Buffer.from('variant') }],
      });
    }

    const files = await readdir(path.join(dataDir, 'images', 'casa-verde'));

    expect(files.every((name) => name.startsWith('server-generated-id-'))).toBe(true);
    expect(files.some((name) => name.includes('etc') || name.includes('passwd'))).toBe(false);
  });
});
