import { describe, expect, it } from 'vitest';
import { signValue, verifySignedValue } from './signed-cookie';

describe('signValue / verifySignedValue', () => {
  it('verifica un valor firmado con el mismo secreto', () => {
    const signed = signValue('session-id-123', 'un-secreto');

    expect(verifySignedValue(signed, 'un-secreto')).toBe('session-id-123');
  });

  it('rechaza un valor firmado con otro secreto', () => {
    const signed = signValue('session-id-123', 'un-secreto');

    expect(verifySignedValue(signed, 'otro-secreto')).toBeNull();
  });

  it('rechaza un valor manipulado (mismo id, otra firma)', () => {
    const signed = signValue('session-id-123', 'un-secreto');
    const tampered = `session-id-attacker-controlled${signed.slice(signed.lastIndexOf('.'))}`;

    expect(verifySignedValue(tampered, 'un-secreto')).toBeNull();
  });

  it('rechaza un valor sin firma', () => {
    expect(verifySignedValue('sin-punto-separador', 'un-secreto')).toBeNull();
    expect(verifySignedValue('', 'un-secreto')).toBeNull();
  });
});
