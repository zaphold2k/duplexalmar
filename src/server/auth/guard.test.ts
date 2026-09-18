import { describe, expect, it } from 'vitest';
import { decideAccess } from './guard';

describe('decideAccess', () => {
  it('el login del panel siempre es accesible, con o sin sesión', () => {
    expect(decideAccess('/admin/login', false)).toBe('allow');
    expect(decideAccess('/admin/login', true)).toBe('allow');
  });

  it('sin sesión, las rutas del panel redirigen al login', () => {
    expect(decideAccess('/admin', false)).toBe('redirect-login');
    expect(decideAccess('/admin/casa-rosa', false)).toBe('redirect-login');
  });

  it('con sesión, las rutas del panel se permiten', () => {
    expect(decideAccess('/admin', true)).toBe('allow');
    expect(decideAccess('/admin/casa-rosa', true)).toBe('allow');
  });

  it('sin sesión, los endpoints de escritura responden no autorizado (no redirigen)', () => {
    expect(decideAccess('/api/admin/casa-rosa/upload', false)).toBe('unauthorized');
  });

  it('con sesión, los endpoints de escritura se permiten', () => {
    expect(decideAccess('/api/admin/casa-rosa/upload', true)).toBe('allow');
  });

  it('el sitio público no requiere sesión', () => {
    expect(decideAccess('/', false)).toBe('allow');
    expect(decideAccess('/casa-rosa', false)).toBe('allow');
    expect(decideAccess('/images/casa-rosa/x-480.webp', false)).toBe('allow');
  });
});
