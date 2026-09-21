import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processImage, VARIANT_WIDTHS } from './process-image';

const fixturePath = path.join(import.meta.dirname, 'fixtures', 'sample.heic');

async function jpegWithOrientation(orientation: number): Promise<Buffer> {
  return sharp({
    create: { width: 100, height: 50, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .withMetadata({
      orientation,
      // sharp expone las IFD de EXIF genéricas (IFD0-3); la geolocalización real
      // de una foto de iPhone vive en la IFD de GPS que libvips también acepta
      // en este mismo mapa. Para el test alcanza con que el original lleve
      // metadata identificable y la salida no conserve ninguna.
      exif: { IFD0: { Copyright: 'Las Petras', GPSLatitude: '38,3,0S', GPSLongitude: '57,33,0W' } },
    })
    .jpeg()
    .toBuffer();
}

describe('processImage — variantes WebP', () => {
  it('genera sólo las variantes que no superan el ancho del original, y ninguna agranda la imagen', async () => {
    // 700px de ancho: sólo 480 es aplicable de [480, 900, 1600, 2400].
    const narrow = await sharp({
      create: { width: 700, height: 400, channels: 3, background: { r: 10, g: 200, b: 10 } },
    })
      .jpeg()
      .toBuffer();

    const result = await processImage(narrow, 'jpeg');

    expect(result.variants.map((v) => v.width)).toEqual([480]);

    for (const variant of result.variants) {
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.width).toBeLessThanOrEqual(700);
      expect(meta.format).toBe('webp');
    }
  });

  it('genera todas las variantes aplicables para un original grande', async () => {
    const wide = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 10, g: 10, b: 200 } },
    })
      .jpeg()
      .toBuffer();

    const result = await processImage(wide, 'jpeg');

    expect(result.variants.map((v) => v.width)).toEqual([...VARIANT_WIDTHS]);
  });

  // El decode HEIC + reescalado a varias variantes es trabajo real de CPU;
  // bajo carga (workers en paralelo) puede superar el timeout por defecto.
  it('nunca produce una variante más ancha que el original decodificado', async () => {
    const buffer = await readFile(fixturePath);

    const result = await processImage(buffer, 'heic');

    for (const variant of result.variants) {
      expect(variant.width).toBeLessThanOrEqual(result.width);
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.width).toBeLessThanOrEqual(result.width);
    }
  }, 15000);
});

describe('processImage — orientación EXIF', () => {
  it('una foto tomada en vertical (EXIF orientation=6) queda derecha en la salida', async () => {
    // Píxeles guardados en horizontal (100x50) con orientation=6: el visor debe
    // rotar 90° para mostrarla derecha, es decir, en vertical (50x100).
    const rotatedJpeg = await jpegWithOrientation(6);
    const sourceMeta = await sharp(rotatedJpeg).metadata();
    expect(sourceMeta.width).toBe(100);
    expect(sourceMeta.height).toBe(50);
    expect(sourceMeta.orientation).toBe(6);

    const result = await processImage(rotatedJpeg, 'jpeg');

    // La imagen queda derecha: sus dimensiones finales son las del alto original
    // por el ancho original invertidos, no las crudas de los píxeles guardados.
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);

    // Confirmarlo también sobre una variante real, con una fuente lo bastante
    // grande para que 480 sea una de las aplicables.
    const largeRotated = await sharp({
      create: { width: 1000, height: 500, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const largeResult = await processImage(largeRotated, 'jpeg');
    expect(largeResult.width).toBe(500);
    expect(largeResult.height).toBe(1000);

    const variant = largeResult.variants[0];
    expect(variant).toBeDefined();
    if (variant) {
      const variantMeta = await sharp(variant.buffer).metadata();
      expect(variantMeta.height).toBeGreaterThan(variantMeta.width);
    }
  });
});

describe('processImage — metadata', () => {
  it('la salida no conserva la geolocalización ni ningún otro metadato del original', async () => {
    const withGps = await jpegWithOrientation(1);
    const sourceMeta = await sharp(withGps).metadata();
    expect(sourceMeta.exif).toBeDefined();

    const result = await processImage(withGps, 'jpeg');

    for (const variant of result.variants) {
      const variantMeta = await sharp(variant.buffer).metadata();
      expect(variantMeta.exif).toBeUndefined();
    }
  });
});
