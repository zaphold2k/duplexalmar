import { describe, expect, it } from 'vitest';
import { hashPassword } from './password';
import { verifyCredentials } from './verify-credentials';

describe('verifyCredentials', () => {
  it('acepta usuario y contraseña correctos', async () => {
    const credentials = { username: 'anfitrion', passwordHash: await hashPassword('correcta') };

    expect(await verifyCredentials('anfitrion', 'correcta', credentials)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const credentials = { username: 'anfitrion', passwordHash: await hashPassword('correcta') };

    expect(await verifyCredentials('anfitrion', 'incorrecta', credentials)).toBe(false);
  });

  it('rechaza un usuario incorrecto aunque la contraseña sea correcta', async () => {
    const credentials = { username: 'anfitrion', passwordHash: await hashPassword('correcta') };

    expect(await verifyCredentials('otro-usuario', 'correcta', credentials)).toBe(false);
  });
});
