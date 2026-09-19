import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_MANIFEST, type HouseManifest } from './manifest-schema';
import { readManifest, writeManifest } from './manifest-store';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'duplexalmar-manifest-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

function manifestWithMarker(marker: number): HouseManifest {
  const id = `img-${String(marker)}`;
  return {
    version: 1,
    cover: id,
    gallery: [id],
    images: {
      [id]: {
        alt: `marca ${String(marker)}`,
        width: 100,
        height: 100,
        originalExt: 'webp',
        uploadedAt: '2026-09-07T23:40:00Z',
      },
    },
  };
}

describe('readManifest', () => {
  it('devuelve el estado vacío cuando la casa todavía no tiene archivo, sin fallar', async () => {
    const manifest = await readManifest(dataDir, 'casa-rosa');

    expect(manifest).toEqual(EMPTY_MANIFEST);
    expect(manifest.gallery).toEqual([]);
    expect(manifest.cover).toBeNull();
  });

  it('lee de vuelta exactamente lo que se escribió', async () => {
    const written = manifestWithMarker(1);
    await writeManifest(dataDir, 'casa-verde', written);

    const read = await readManifest(dataDir, 'casa-verde');

    expect(read).toEqual(written);
  });
});

describe('writeManifest', () => {
  it('escribe de forma atómica: el archivo destino nunca queda truncado ni a medio escribir', async () => {
    const filePath = path.join(dataDir, 'houses', 'casa-rosa.json');
    let observedReads = 0;
    const readerState = { stop: false };

    const reader = (async () => {
      while (!readerState.stop) {
        try {
          const raw = await readFile(filePath, 'utf-8');
          // Un archivo truncado por una escritura no atómica rompería el parseo.
          expect(() => {
            JSON.parse(raw);
          }).not.toThrow();
          observedReads += 1;
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            throw error;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    })();

    const writeCount = 30;
    for (let i = 0; i < writeCount; i += 1) {
      await writeManifest(dataDir, 'casa-rosa', manifestWithMarker(i));
    }

    readerState.stop = true;
    await reader;

    expect(observedReads).toBeGreaterThan(0);
  });

  it('serializa escrituras concurrentes a la misma casa sin perder la última', async () => {
    const writeCount = 25;
    await Promise.all(
      Array.from({ length: writeCount }, (_, i) =>
        writeManifest(dataDir, 'casa-verde', manifestWithMarker(i)),
      ),
    );

    const finalManifest = await readManifest(dataDir, 'casa-verde');

    // Al encolarse en el mismo tick, el orden de aplicación coincide con el orden
    // de invocación: el resultado final es exactamente la última escritura pedida.
    expect(finalManifest).toEqual(manifestWithMarker(writeCount - 1));
  });

  it('no pisa el manifest de otra casa', async () => {
    await writeManifest(dataDir, 'casa-rosa', manifestWithMarker(1));
    await writeManifest(dataDir, 'casa-verde', manifestWithMarker(2));

    expect(await readManifest(dataDir, 'casa-rosa')).toEqual(manifestWithMarker(1));
    expect(await readManifest(dataDir, 'casa-verde')).toEqual(manifestWithMarker(2));
  });
});
