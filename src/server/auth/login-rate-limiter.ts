export interface LoginRateLimiter {
  /** Milisegundos que hay que esperar antes de intentar de nuevo; 0 si no hay demora. */
  getDelayMs: (key: string, now: number) => number;
  registerFailure: (key: string, now: number) => void;
  registerSuccess: (key: string) => void;
}

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;

/**
 * Limitador de intentos de login por origen, en memoria, con demora
 * creciente (ver design.md, decisión 7). Cada fallo duplica la demora del
 * siguiente intento (1s, 2s, 4s, ... hasta un tope de 60s); un login
 * correcto limpia el contador.
 */
export function createLoginRateLimiter(): LoginRateLimiter {
  const failuresByKey = new Map<string, { count: number; blockedUntil: number }>();

  return {
    getDelayMs(key, now) {
      const entry = failuresByKey.get(key);
      if (!entry) return 0;
      return Math.max(0, entry.blockedUntil - now);
    },
    registerFailure(key, now) {
      const previous = failuresByKey.get(key) ?? { count: 0, blockedUntil: 0 };
      const count = previous.count + 1;
      const delayMs = Math.min(BASE_DELAY_MS * 2 ** (count - 1), MAX_DELAY_MS);
      failuresByKey.set(key, { count, blockedUntil: now + delayMs });
    },
    registerSuccess(key) {
      failuresByKey.delete(key);
    },
  };
}
