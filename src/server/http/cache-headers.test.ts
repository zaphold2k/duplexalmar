import { describe, expect, it } from 'vitest';
import { applyPublicCacheHeaders } from './cache-headers';

describe('applyPublicCacheHeaders', () => {
  it('marca el HTML sin caché compartida de larga duración', () => {
    const response = applyPublicCacheHeaders('/casa-rosa', new Response('<html></html>'));

    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('no toca las respuestas de /images/, que ya declaran su propia caché', () => {
    const original = new Response('bytes', {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    });

    const response = applyPublicCacheHeaders('/images/casa-rosa/abc-480.webp', original);

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('no pisa un Cache-Control que la respuesta ya trae explícito', () => {
    const original = new Response('ok', { headers: { 'Cache-Control': 'private' } });

    const response = applyPublicCacheHeaders('/admin', original);

    expect(response.headers.get('Cache-Control')).toBe('private');
  });
});
