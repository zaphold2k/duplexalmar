import { randomBytes } from 'node:crypto';

/** Identificador de sesión aleatorio, opaco, no adivinable. */
export function generateSessionId(): string {
  return randomBytes(32).toString('base64url');
}
