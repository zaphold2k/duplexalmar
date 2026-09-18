import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('una contraseña correcta valida contra su propio hash', async () => {
    const hash = await hashPassword('correcta-123');

    expect(await verifyPassword('correcta-123', hash)).toBe(true);
  });

  it('una contraseña incorrecta no valida', async () => {
    const hash = await hashPassword('correcta-123');

    expect(await verifyPassword('otra-cosa', hash)).toBe(false);
  });

  it('produce un hash distinto cada vez (sal aleatoria) para la misma contraseña', async () => {
    const [hashA, hashB] = await Promise.all([hashPassword('misma'), hashPassword('misma')]);

    expect(hashA).not.toBe(hashB);
    expect(await verifyPassword('misma', hashA)).toBe(true);
    expect(await verifyPassword('misma', hashB)).toBe(true);
  });

  it('un hash malformado no valida ni lanza', async () => {
    await expect(verifyPassword('cualquiera', 'no-es-un-hash')).resolves.toBe(false);
    await expect(verifyPassword('cualquiera', '')).resolves.toBe(false);
    await expect(verifyPassword('cualquiera', 'scrypt$abc$8$1$c2FsdA==$aGFzaA==')).resolves.toBe(
      false,
    );
  });
});
