import type { APIRoute } from 'astro';
import { config } from '../../../../server/config';
import { deleteHomeHeroImage } from '../../../../server/home-hero';
import { jsonResponse } from '../../../../server/http/json-response';

export const POST: APIRoute = async () => {
  await deleteHomeHeroImage(config.dataDir);
  return jsonResponse({ ok: true });
};
