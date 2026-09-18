import type { LoginRateLimiter } from './login-rate-limiter';
import type { SessionStore } from './session-store';
import { verifyCredentials, type AdminCredentials } from './verify-credentials';

export type LoginOutcome = 'blocked' | 'invalid' | 'success';

export interface LoginAttemptResult {
  outcome: LoginOutcome;
  sessionId?: string;
  expiresAt?: number;
}

export interface LoginAttemptDeps {
  credentials: AdminCredentials;
  sessionStore: SessionStore;
  rateLimiter: LoginRateLimiter;
  now: number;
  sessionTtlMs: number;
  generateId: () => string;
}

/**
 * Procesa un intento de login: aplica el límite de intentos por origen,
 * verifica las credenciales y, si son correctas, abre la sesión. Separado de
 * la página para poder probarlo sin un request real de Astro (reloj, ids y
 * los dos stores se inyectan, ver CODESTYLE §4).
 */
export async function attemptLogin(
  clientKey: string,
  username: string,
  password: string,
  deps: LoginAttemptDeps,
): Promise<LoginAttemptResult> {
  if (deps.rateLimiter.getDelayMs(clientKey, deps.now) > 0) {
    return { outcome: 'blocked' };
  }

  const valid = await verifyCredentials(username, password, deps.credentials);
  if (!valid) {
    deps.rateLimiter.registerFailure(clientKey, deps.now);
    return { outcome: 'invalid' };
  }

  deps.rateLimiter.registerSuccess(clientKey);
  const sessionId = deps.generateId();
  const expiresAt = deps.now + deps.sessionTtlMs;
  deps.sessionStore.create(sessionId, expiresAt);
  return { outcome: 'success', sessionId, expiresAt };
}
