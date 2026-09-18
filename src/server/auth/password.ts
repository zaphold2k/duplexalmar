import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Parámetros de costo de scrypt (ver design.md, decisión 7: "función de
// derivación con costo configurable"). N=2^15 es un costo razonable para un
// login humano ocasional sin volverse notorio.
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Node exige `maxmem >= 128 * N * r` aproximadamente; el default (32 MiB)
// queda justo en el límite para N=2^15, r=8, así que se sube explícitamente.
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...params, maxmem: SCRYPT_MAXMEM }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/** Hashea una contraseña con scrypt. El resultado se autodescribe (parámetros + sal + hash). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    derivedKey.toString('base64'),
  ].join('$');
}

/**
 * Verifica una contraseña contra un hash generado por `hashPassword`.
 * Nunca lanza ante un hash malformado: lo trata como no coincidente.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const salt = Buffer.from(saltB64 ?? '', 'base64');
  const expected = Buffer.from(hashB64 ?? '', 'base64');
  if (salt.length === 0 || expected.length === 0) return false;

  let derivedKey: Buffer;
  try {
    derivedKey = await deriveKey(password, salt, expected.length, { N, r, p });
  } catch {
    return false;
  }

  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}
