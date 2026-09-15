import type { APIRoute } from 'astro';
import { isHouseSlug } from '../../../../content/houses';
import { NotFoundError } from '../../../../lib/errors';
import { stringField } from '../../../../lib/form-data';
import { config } from '../../../../server/config';
import { readManifest, setAltText, writeManifest } from '../../../../server/houses';
import { jsonResponse } from '../../../../server/http/json-response';

export const POST: APIRoute = async ({ params, request }) => {
  const house = params.house;
  if (house === undefined || !isHouseSlug(house)) {
    return jsonResponse({ error: 'Casa inválida' }, 404);
  }

  const formData = await request.formData();
  const imageId = stringField(formData, 'imageId');
  const alt = stringField(formData, 'alt');

  try {
    const manifest = await readManifest(config.dataDir, house);
    const updated = setAltText(manifest, imageId, alt);
    await writeManifest(config.dataDir, house, updated);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonResponse({ error: error.message }, 400);
    }
    throw error;
  }
};
