import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImageFormat } from './detect-format';
import { originalFileName, variantFileName } from './filenames';
import type { ProcessedImage } from './process-image';

function imagesDir(dataDir: string, houseSlug: string): string {
  return path.join(dataDir, 'images', houseSlug);
}

/**
 * Guarda el original y las variantes de una imagen ya procesada bajo
 * `/data/images/<casa>/`. La ruta se construye exclusivamente a partir del
 * `id` generado por el servidor: el nombre que envió el cliente nunca llega
 * a este módulo ni influye en ningún path.
 */
export async function saveProcessedImage(
  dataDir: string,
  houseSlug: string,
  id: string,
  originalBuffer: Buffer,
  originalFormat: ImageFormat,
  processed: ProcessedImage,
): Promise<void> {
  const dir = imagesDir(dataDir, houseSlug);
  await mkdir(dir, { recursive: true });

  await writeFile(path.join(dir, originalFileName(id, originalFormat)), originalBuffer);

  for (const variant of processed.variants) {
    await writeFile(path.join(dir, variantFileName(id, variant.width)), variant.buffer);
  }
}
