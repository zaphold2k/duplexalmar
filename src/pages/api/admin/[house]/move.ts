import type { APIRoute } from 'astro';
import { isHouseSlug } from '../../../../content/houses';
import { NotFoundError } from '../../../../lib/errors';
import { stringField } from '../../../../lib/form-data';
import { config } from '../../../../server/config';
import {
  moveImage,
  readManifest,
  writeManifest,
  type MoveDirection,
} from '../../../../server/houses';
import { jsonResponse } from '../../../../server/http/json-response';

function isMoveDirection(value: string): value is MoveDirection {
  return value === 'forward' || value === 'backward';
}

export const POST: APIRoute = async ({ params, request }) => {
  const house = params.house;
  if (house === undefined || !isHouseSlug(house)) {
    return jsonResponse({ error: 'Casa inválida' }, 404);
  }

  const formData = await request.formData();
  const imageId = stringField(formData, 'imageId');
  const direction = stringField(formData, 'direction');

  if (!isMoveDirection(direction)) {
    return jsonResponse({ error: 'La dirección debe ser "forward" o "backward"' }, 400);
  }

  try {
    const manifest = await readManifest(config.dataDir, house);
    const updated = moveImage(manifest, imageId, direction);
    await writeManifest(config.dataDir, house, updated);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonResponse({ error: error.message }, 400);
    }
    throw error;
  }
};
