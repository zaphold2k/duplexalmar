import { createLoginRateLimiter } from './login-rate-limiter';
import { createSessionStore } from './session-store';

export { hashPassword, verifyPassword } from './password';
export { verifyCredentials } from './verify-credentials';
export type { AdminCredentials } from './verify-credentials';

export { createSessionStore } from './session-store';
export type { SessionRecord, SessionStore } from './session-store';

export { generateSessionId } from './session-id';

export { createLoginRateLimiter } from './login-rate-limiter';
export type { LoginRateLimiter } from './login-rate-limiter';

export { attemptLogin } from './login';
export type { LoginAttemptDeps, LoginAttemptResult, LoginOutcome } from './login';

export { decideAccess } from './guard';
export type { GuardDecision } from './guard';

export { signValue, verifySignedValue } from './signed-cookie';

export const SESSION_COOKIE_NAME = 'session';
/** Vencimiento de la sesión: 12 horas. Un anfitrión que entra unas pocas veces al año no necesita más. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Instancias únicas para todo el proceso: las sesiones y el limitador de
 * intentos viven en memoria (ver design.md, decisión 7), así que tienen que
 * ser un único mapa compartido por todas las peticiones, no uno por request.
 */
export const sessionStore = createSessionStore();
export const loginRateLimiter = createLoginRateLimiter();
