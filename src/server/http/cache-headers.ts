/**
 * Sin caché compartida de larga duración para el HTML: un cambio de portada
 * o de galería se ve en la siguiente carga, sin esperar a que expire una
 * caché intermedia (ver spec galeria-casas y admin-imagenes, "Cambio de
 * portada"). Los recursos bajo `/images/` declaran su propia caché
 * inmutable de un año (ver serve-file.ts) y no se tocan acá.
 */
export function applyPublicCacheHeaders(pathname: string, response: Response): Response {
  if (!pathname.startsWith('/images/') && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-cache');
  }
  return response;
}
