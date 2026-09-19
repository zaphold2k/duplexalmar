import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
};

function isSafeSegment(segment: string): boolean {
  return (
    segment.length > 0 && !segment.includes('/') && !segment.includes('\\') && segment !== '..'
  );
}

/**
 * Sirve un archivo de `/data/images/<casa>/` para el endpoint público
 * `/images/<casa>/<archivo>`. En producción, el reverse proxy sirve este
 * mismo path directamente desde el volumen sin pasar por Node (ver
 * design.md, decisión 11); este endpoint es el camino que efectivamente se
 * usa en desarrollo y la red de seguridad si el proxy no estuviera delante.
 *
 * Caché inmutable de un año: el nombre de archivo lleva un id que nunca
 * cambia de contenido (ver design.md, decisión 4).
 */
export async function serveImageFile(
  dataDir: string,
  house: string | undefined,
  file: string | undefined,
): Promise<Response> {
  if (house === undefined || file === undefined || !isSafeSegment(house) || !isSafeSegment(file)) {
    return new Response('No encontrado', { status: 404 });
  }

  const filePath = path.join(dataDir, 'images', house, file);

  try {
    await stat(filePath);
  } catch {
    return new Response('No encontrado', { status: 404 });
  }

  const contents = await readFile(filePath);
  const extension = path.extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream';

  return new Response(new Uint8Array(contents), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
