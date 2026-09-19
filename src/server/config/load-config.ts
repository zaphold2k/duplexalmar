import { envSchema } from './schema';

export interface AppConfig {
  admin: {
    username: string;
    passwordHash: string;
  };
  session: {
    secret: string;
  };
  whatsapp: {
    number: string;
  };
  uploads: {
    maxFileSizeBytes: number;
    maxBatchSize: number;
  };
  dataDir: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Valida el entorno completo al arrancar; nunca lee `process.env` fuera de este módulo
 * (ver CODESTYLE §4, "Configuración centralizada").
 */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new ConfigError(
      `No se pudo arrancar: la configuración del entorno es inválida.\n${details}`,
    );
  }

  const parsed = result.data;

  return {
    admin: {
      username: parsed.ADMIN_USERNAME,
      passwordHash: parsed.ADMIN_PASSWORD_HASH,
    },
    session: {
      secret: parsed.SESSION_SECRET,
    },
    whatsapp: {
      number: parsed.WHATSAPP_NUMBER,
    },
    uploads: {
      maxFileSizeBytes: parsed.MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024,
      maxBatchSize: parsed.MAX_UPLOAD_BATCH_SIZE,
    },
    dataDir: parsed.DATA_DIR,
  };
}
