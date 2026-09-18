import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../lib/errors';
import { EMPTY_MANIFEST, parseManifest } from './manifest-schema';

describe('parseManifest', () => {
  it('acepta el manifest vacío', () => {
    expect(parseManifest(EMPTY_MANIFEST)).toEqual(EMPTY_MANIFEST);
  });

  it('acepta un manifest con imágenes, portada y galería consistentes', () => {
    const manifest = {
      version: 1,
      cover: 'img-1',
      gallery: ['img-1', 'img-2'],
      images: {
        'img-1': {
          alt: 'Vista al mar',
          width: 4032,
          height: 3024,
          originalExt: 'heic',
          uploadedAt: '2026-09-07T23:40:00Z',
        },
        'img-2': {
          alt: '',
          width: 1200,
          height: 800,
          originalExt: 'jpg',
          uploadedAt: '2026-09-08T10:00:00Z',
        },
      },
    };

    expect(parseManifest(manifest)).toEqual(manifest);
  });

  it('rechaza un manifest cuya galería referencia un id de imagen inexistente', () => {
    const manifest = { version: 1, cover: null, gallery: ['no-existe'], images: {} };

    expect(() => parseManifest(manifest)).toThrow(ValidationError);
    expect(() => parseManifest(manifest)).toThrow(/no-existe/);
  });

  it('rechaza un manifest cuya portada referencia un id de imagen inexistente', () => {
    const manifest = { version: 1, cover: 'no-existe', gallery: [], images: {} };

    expect(() => parseManifest(manifest)).toThrow(ValidationError);
    expect(() => parseManifest(manifest)).toThrow(/no-existe/);
  });

  it('rechaza un manifest con campos de imagen faltantes o de tipo incorrecto', () => {
    const manifest = {
      version: 1,
      cover: null,
      gallery: ['img-1'],
      images: { 'img-1': { alt: 'sin dimensiones' } },
    };

    expect(() => parseManifest(manifest)).toThrow(ValidationError);
  });

  it('rechaza un valor que no es un objeto', () => {
    expect(() => parseManifest('no es un manifest')).toThrow(ValidationError);
    expect(() => parseManifest(null)).toThrow(ValidationError);
  });
});
