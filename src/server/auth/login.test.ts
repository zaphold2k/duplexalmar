import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from './password';
import { attemptLogin, type LoginAttemptDeps } from './login';
import { createLoginRateLimiter } from './login-rate-limiter';
import { createSessionStore } from './session-store';

let deps: LoginAttemptDeps;
let idCounter: number;

beforeEach(async () => {
  idCounter = 0;
  deps = {
    credentials: { username: 'anfitrion', passwordHash: await hashPassword('correcta') },
    sessionStore: createSessionStore(),
    rateLimiter: createLoginRateLimiter(),
    now: 1_000_000,
    sessionTtlMs: 60_000,
    generateId: () => {
      idCounter += 1;
      return `session-${String(idCounter)}`;
    },
  };
});

describe('attemptLogin', () => {
  it('credenciales correctas: abre una sesión y limpia los intentos fallidos del origen', async () => {
    const result = await attemptLogin('1.2.3.4', 'anfitrion', 'correcta', deps);

    expect(result).toEqual({
      outcome: 'success',
      sessionId: 'session-1',
      expiresAt: deps.now + deps.sessionTtlMs,
    });
    expect(deps.sessionStore.get('session-1', deps.now)).not.toBeNull();
  });

  it('contraseña incorrecta: no abre sesión y registra el fallo', async () => {
    const result = await attemptLogin('1.2.3.4', 'anfitrion', 'incorrecta', deps);

    expect(result).toEqual({ outcome: 'invalid' });
    expect(deps.rateLimiter.getDelayMs('1.2.3.4', deps.now)).toBeGreaterThan(0);
  });

  it('usuario incorrecto: no abre sesión (mismo resultado que contraseña incorrecta)', async () => {
    const result = await attemptLogin('1.2.3.4', 'otro', 'correcta', deps);

    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('bloquea el intento mientras el origen está demorado por fallos previos', async () => {
    await attemptLogin('1.2.3.4', 'anfitrion', 'mal', deps);
    const blockedDelay = deps.rateLimiter.getDelayMs('1.2.3.4', deps.now);
    expect(blockedDelay).toBeGreaterThan(0);

    // Con credenciales correctas, pero todavía dentro de la ventana de demora.
    const result = await attemptLogin('1.2.3.4', 'anfitrion', 'correcta', deps);

    expect(result).toEqual({ outcome: 'blocked' });
    expect(deps.sessionStore.get('session-1', deps.now)).toBeNull();
  });
});
