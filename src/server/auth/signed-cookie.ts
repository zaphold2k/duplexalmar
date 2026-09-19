import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Firma un valor con HMAC-SHA256 usando el secreto de sesión. El id de
 * sesión en sí ya es un token de 256 bits impredecible (ver session-id.ts):
 * la firma es una defensa adicional para rechazar cookies manipuladas sin
 * siquiera consultar el store de sesiones.
 */
export function signValue(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${signature}`;
}

/** Verifica la firma y devuelve el valor original, o `null` si no es válida. */
export function verifySignedValue(signedValue: string, secret: string): string | null {
  const separatorIndex = signedValue.lastIndexOf('.');
  if (separatorIndex === -1) return null;

  const value = signedValue.slice(0, separatorIndex);
  const signature = signedValue.slice(separatorIndex + 1);
  const expectedSignature = createHmac('sha256', secret).update(value).digest('base64url');

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  return value;
}
