import type { APIRoute } from 'astro';
import { isHouseSlug } from '../../../../content/houses';
import { stringField } from '../../../../lib/form-data';
import { NotFoundError } from '../../../../lib/errors';
import { config } from '../../../../server/config';
import { jsonResponse } from '../../../../server/http/json-response';
import { readManifest, setCover, writeManifest } from '../../../../server/houses';

export const POST: APIRoute = async ({ params, request }) => {
  const house = params.house;
  if (house === undefined || !isHouseSlug(house)) {
    return jsonResponse({ error: 'Casa inválida' }, 404);
  }

  const formData = await request.formData();
  const imageId = stringField(formData, 'imageId');

  try {
    const manifest = await readManifest(config.dataDir, house);
    const updated = setCover(manifest, imageId);
    await writeManifest(config.dataDir, house, updated);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonResponse({ error: error.message }, 400);
    }
    throw error;
  }
};
