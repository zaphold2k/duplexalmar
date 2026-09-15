import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './load-config';

const validEnv = {
  ADMIN_USERNAME: 'anfitrion',
  ADMIN_PASSWORD_HASH: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$hashhashhash',
  SESSION_SECRET: 'a'.repeat(32),
  WHATSAPP_NUMBER: '5492235293371',
  DATA_DIR: '/data',
  MAX_UPLOAD_FILE_SIZE_MB: '15',
  MAX_UPLOAD_BATCH_SIZE: '20',
};

describe('loadConfig', () => {
  it('construye un objeto de configuración tipado a partir de un entorno completo', () => {
    const config = loadConfig(validEnv);

    expect(config).toEqual({
      admin: { username: 'anfitrion', passwordHash: validEnv.ADMIN_PASSWORD_HASH },
      session: { secret: validEnv.SESSION_SECRET },
      whatsapp: { number: '5492235293371' },
      uploads: { maxFileSizeBytes: 15 * 1024 * 1024, maxBatchSize: 20 },
      dataDir: '/data',
    });
  });

  it('falla nombrando la variable faltante cuando el entorno está incompleto', () => {
    const incompleteEnv = { ...validEnv, WHATSAPP_NUMBER: undefined };

    expect(() => loadConfig(incompleteEnv)).toThrow(ConfigError);
    try {
      loadConfig(incompleteEnv);
      expect.unreachable('loadConfig debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toContain('WHATSAPP_NUMBER');
    }
  });

  it('falla nombrando la variable inválida cuando el valor no cumple el formato esperado', () => {
    const invalidEnv = { ...validEnv, MAX_UPLOAD_BATCH_SIZE: 'no-es-un-numero' };

    try {
      loadConfig(invalidEnv);
      expect.unreachable('loadConfig debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toContain('MAX_UPLOAD_BATCH_SIZE');
    }
  });
});
