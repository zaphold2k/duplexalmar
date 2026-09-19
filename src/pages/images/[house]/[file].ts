import type { APIRoute } from 'astro';
import { config } from '../../../server/config';
import { serveImageFile } from '../../../server/images/serve-file';

export const GET: APIRoute = ({ params }) =>
  serveImageFile(config.dataDir, params.house, params.file);
