import type { APIRoute } from 'astro';
import { config } from '../../../../server/config';
import { replaceHomeHeroImage } from '../../../../server/home-hero';
import { jsonResponse } from '../../../../server/http/json-response';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const entry = formData.get('file');
  if (!(entry instanceof File)) {
    return jsonResponse({ error: 'No se envió ningún archivo' }, 400);
  }

  const result = await replaceHomeHeroImage(
    config.dataDir,
    { clientFileName: entry.name, buffer: Buffer.from(await entry.arrayBuffer()) },
    { maxFileSizeBytes: config.uploads.maxFileSizeBytes },
  );

  return jsonResponse({ result });
};
