import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter } from './login-rate-limiter';

describe('createLoginRateLimiter', () => {
  it('no demora el primer intento', () => {
    const limiter = createLoginRateLimiter();

    expect(limiter.getDelayMs('1.2.3.4', 0)).toBe(0);
  });

  it('tras varios intentos fallidos, los siguientes se demoran de forma creciente', () => {
    const limiter = createLoginRateLimiter();
    const key = '1.2.3.4';

    limiter.registerFailure(key, 0);
    const delayAfterFirst = limiter.getDelayMs(key, 0);
    expect(delayAfterFirst).toBeGreaterThan(0);

    limiter.registerFailure(key, 0);
    const delayAfterSecond = limiter.getDelayMs(key, 0);
    expect(delayAfterSecond).toBeGreaterThan(delayAfterFirst);

    limiter.registerFailure(key, 0);
    const delayAfterThird = limiter.getDelayMs(key, 0);
    expect(delayAfterThird).toBeGreaterThan(delayAfterSecond);
  });

  it('la demora vence: pasado el tiempo, vuelve a permitir el intento', () => {
    const limiter = createLoginRateLimiter();
    const key = '1.2.3.4';

    limiter.registerFailure(key, 0);
    const delay = limiter.getDelayMs(key, 0);

    expect(limiter.getDelayMs(key, delay)).toBe(0);
  });

  it('un login correcto limpia el historial de fallos de ese origen', () => {
    const limiter = createLoginRateLimiter();
    const key = '1.2.3.4';

    limiter.registerFailure(key, 0);
    limiter.registerFailure(key, 0);
    limiter.registerSuccess(key);

    expect(limiter.getDelayMs(key, 0)).toBe(0);
  });

  it('orígenes distintos no se afectan entre sí', () => {
    const limiter = createLoginRateLimiter();

    limiter.registerFailure('1.1.1.1', 0);
    limiter.registerFailure('1.1.1.1', 0);

    expect(limiter.getDelayMs('2.2.2.2', 0)).toBe(0);
  });
});
