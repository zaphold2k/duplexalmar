import type { APIRoute } from 'astro';
import { isHouseSlug } from '../../../../content/houses';
import { config } from '../../../../server/config';
import { jsonResponse } from '../../../../server/http/json-response';
import { processUploadBatch, type UploadedFile } from '../../../../server/images';

export const POST: APIRoute = async ({ params, request }) => {
  const house = params.house;
  if (house === undefined || !isHouseSlug(house)) {
    return jsonResponse({ error: 'Casa inválida' }, 404);
  }

  const formData = await request.formData();
  const fileEntries = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File);

  if (fileEntries.length === 0) {
    return jsonResponse({ error: 'No se envió ningún archivo' }, 400);
  }

  if (fileEntries.length > config.uploads.maxBatchSize) {
    return jsonResponse(
      { error: `El lote supera el máximo de ${String(config.uploads.maxBatchSize)} fotos por vez` },
      400,
    );
  }

  const files: UploadedFile[] = await Promise.all(
    fileEntries.map(async (file) => ({
      clientFileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );

  const results = await processUploadBatch(config.dataDir, house, files, {
    maxFileSizeBytes: config.uploads.maxFileSizeBytes,
  });

  return jsonResponse({ results });
};
