import { z } from 'zod';

export const envSchema = z.object({
  ADMIN_USERNAME: z.string().trim().min(1, 'no puede estar vacío'),
  ADMIN_PASSWORD_HASH: z.string().trim().min(1, 'no puede estar vacío'),
  SESSION_SECRET: z.string().min(32, 'debe tener al menos 32 caracteres'),
  WHATSAPP_NUMBER: z
    .string()
    .regex(
      /^\d{10,15}$/,
      'debe ser un número en formato internacional, sólo dígitos (ej: 5492235293371)',
    ),
  DATA_DIR: z.string().trim().min(1, 'no puede estar vacío'),
  MAX_UPLOAD_FILE_SIZE_MB: z.coerce.number().positive('debe ser un número positivo'),
  MAX_UPLOAD_BATCH_SIZE: z.coerce.number().int().positive('debe ser un entero positivo'),
});

export type Env = z.infer<typeof envSchema>;
