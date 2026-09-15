import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readManifest } from '../houses/manifest-store';
import { processUploadBatch, type UploadedFile } from './batch';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'duplexalmar-batch-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

async function validJpeg(background: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width: 600, height: 400, channels: 3, background } })
    .jpeg()
    .toBuffer();
}

function sequentialIds(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `id-${String(counter)}`;
  };
}

describe('processUploadBatch', () => {
  it('procesa un lote válido y agrega cada foto al manifest en orden', async () => {
    const files: UploadedFile[] = [
      { clientFileName: 'a.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { clientFileName: 'b.jpg', buffer: await validJpeg({ r: 0, g: 200, b: 0 }) },
    ];

    const results = await processUploadBatch(dataDir, 'casa-rosa', files, {
      generateId: sequentialIds(),
      now: () => '2026-09-08T00:00:00.000Z',
    });

    expect(results).toEqual([
      { clientFileName: 'a.jpg', status: 'uploaded', imageId: 'id-1' },
      { clientFileName: 'b.jpg', status: 'uploaded', imageId: 'id-2' },
    ]);

    const manifest = await readManifest(dataDir, 'casa-rosa');
    expect(manifest.gallery).toEqual(['id-1', 'id-2']);
  });

  it('un archivo que no es una imagen se informa como fallido sin abortar el resto del lote', async () => {
    const files: UploadedFile[] = [
      { clientFileName: 'buena.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { clientFileName: 'no-es-imagen.jpg', buffer: Buffer.from('esto no es una imagen') },
      { clientFileName: 'tambien-buena.jpg', buffer: await validJpeg({ r: 0, g: 0, b: 200 }) },
    ];

    const results = await processUploadBatch(dataDir, 'casa-rosa', files, {
      generateId: sequentialIds(),
    });

    expect(results.map((r) => r.status)).toEqual(['uploaded', 'failed', 'uploaded']);

    const failure = results[1];
    expect(failure?.status).toBe('failed');
    if (failure?.status === 'failed') {
      expect(failure.reason).toMatch(/no es una imagen válida/i);
    }
  });

  it('un fallo a mitad de lote deja cargadas las fotos anteriores y no referencia la que falló', async () => {
    const corruptJpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

    const files: UploadedFile[] = [
      { clientFileName: 'primera.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { clientFileName: 'corrupta.jpg', buffer: corruptJpeg },
      { clientFileName: 'tercera.jpg', buffer: await validJpeg({ r: 0, g: 0, b: 200 }) },
    ];

    const results = await processUploadBatch(dataDir, 'casa-verde', files, {
      generateId: sequentialIds(),
    });

    expect(results.map((r) => r.status)).toEqual(['uploaded', 'failed', 'uploaded']);

    const manifest = await readManifest(dataDir, 'casa-verde');
    // Las dos que se procesaron correctamente quedan (el id no se genera para
    // la que falló, así que la tercera recibe el segundo id disponible); la
    // corrupta no aparece nunca en el manifest, ni siquiera a medio escribir.
    expect(manifest.gallery).toEqual(['id-1', 'id-2']);
    expect(Object.keys(manifest.images).sort()).toEqual(['id-1', 'id-2']);
    expect(results[2]).toMatchObject({ status: 'uploaded', imageId: 'id-2' });
  });
});
