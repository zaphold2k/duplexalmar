import { describe, expect, it } from 'vitest';
import { createSessionStore } from './session-store';

describe('createSessionStore', () => {
  it('devuelve la sesión creada mientras no venció', () => {
    const store = createSessionStore();
    store.create('abc', 1000);

    expect(store.get('abc', 500)).toEqual({ id: 'abc', expiresAt: 1000 });
  });

  it('devuelve null para un id que no existe', () => {
    const store = createSessionStore();

    expect(store.get('no-existe', 0)).toBeNull();
  });

  it('devuelve null y elimina la sesión una vez vencida', () => {
    const store = createSessionStore();
    store.create('abc', 1000);

    expect(store.get('abc', 1000)).toBeNull();
    // Ya fue eliminada por el vencimiento; consultarla de nuevo con un "now"
    // anterior no la resucita.
    expect(store.get('abc', 0)).toBeNull();
  });

  it('destroy invalida la sesión del lado del servidor: reutilizar el id queda rechazado', () => {
    const store = createSessionStore();
    store.create('abc', 1000);

    store.destroy('abc');

    expect(store.get('abc', 0)).toBeNull();
  });

  it('las instancias no comparten estado entre sí', () => {
    const storeA = createSessionStore();
    const storeB = createSessionStore();
    storeA.create('abc', 1000);

    expect(storeB.get('abc', 0)).toBeNull();
  });
});
