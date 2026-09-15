import type { APIRoute } from 'astro';
import { isHouseSlug } from '../../../../content/houses';
import { NotFoundError } from '../../../../lib/errors';
import { stringField } from '../../../../lib/form-data';
import { config } from '../../../../server/config';
import { readManifest, removeImage, writeManifest } from '../../../../server/houses';
import { deleteImageFiles } from '../../../../server/images';
import { jsonResponse } from '../../../../server/http/json-response';

export const POST: APIRoute = async ({ params, request }) => {
  const house = params.house;
  if (house === undefined || !isHouseSlug(house)) {
    return jsonResponse({ error: 'Casa inválida' }, 404);
  }

  const formData = await request.formData();
  const imageId = stringField(formData, 'imageId');

  try {
    const manifest = await readManifest(config.dataDir, house);
    const updated = removeImage(manifest, imageId);
    // El manifest se actualiza primero: si el borrado de archivos fallara
    // después, el peor caso es un huérfano recuperable (ver design.md,
    // decisión 5), nunca una referencia rota en el sitio público.
    await writeManifest(config.dataDir, house, updated);
    await deleteImageFiles(config.dataDir, house, imageId);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonResponse({ error: error.message }, 400);
    }
    throw error;
  }
};
