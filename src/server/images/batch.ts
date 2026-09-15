import { addImage } from '../houses/manifest-operations';
import { readManifest, writeManifest } from '../houses/manifest-store';
import { detectImageFormat } from './detect-format';
import { generateImageId } from './id-generator';
import { processImage } from './process-image';
import { saveProcessedImage } from './storage';

export interface UploadedFile {
  /** Nombre declarado por el cliente: sólo para reportar, nunca para construir rutas. */
  clientFileName: string;
  buffer: Buffer;
}

export interface BatchItemSuccess {
  clientFileName: string;
  status: 'uploaded';
  imageId: string;
}

export interface BatchItemFailure {
  clientFileName: string;
  status: 'failed';
  reason: string;
}

export type BatchItemResult = BatchItemSuccess | BatchItemFailure;

export interface ProcessUploadBatchDeps {
  now?: () => string;
  generateId?: () => string;
}

/**
 * Procesa un lote de fotos subidas, una por una (nunca en paralelo, ver design.md
 * "Riesgos": memoria acotada). Por cada foto, informa éxito o error sin abortar
 * el resto del lote. El manifest de la casa sólo se actualiza para una foto una
 * vez que su original y todas sus variantes ya están en disco.
 */
export async function processUploadBatch(
  dataDir: string,
  houseSlug: string,
  files: readonly UploadedFile[],
  deps: ProcessUploadBatchDeps = {},
): Promise<BatchItemResult[]> {
  const now = deps.now ?? (() => new Date().toISOString());
  const generateId = deps.generateId ?? generateImageId;
  const results: BatchItemResult[] = [];

  for (const file of files) {
    try {
      const format = detectImageFormat(file.buffer);
      if (format === null) {
        results.push({
          clientFileName: file.clientFileName,
          status: 'failed',
          reason: 'El archivo no es una imagen válida',
        });
        continue;
      }

      const processed = await processImage(file.buffer, format);
      const id = generateId();

      await saveProcessedImage(dataDir, houseSlug, id, file.buffer, format, processed);

      const manifest = await readManifest(dataDir, houseSlug);
      const updated = addImage(manifest, {
        id,
        alt: '',
        width: processed.width,
        height: processed.height,
        originalExt: format === 'jpeg' ? 'jpg' : format,
        uploadedAt: now(),
      });
      await writeManifest(dataDir, houseSlug, updated);

      results.push({ clientFileName: file.clientFileName, status: 'uploaded', imageId: id });
    } catch (error) {
      results.push({
        clientFileName: file.clientFileName,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'Error desconocido al procesar la imagen',
      });
    }
  }

  return results;
}
