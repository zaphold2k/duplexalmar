import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../lib/errors';
import { EMPTY_MANIFEST, type HouseManifest } from './manifest-schema';
import {
  addImage,
  getEffectiveCoverId,
  moveImage,
  removeImage,
  setAltText,
  setCover,
} from './manifest-operations';

function image(id: string, alt = '') {
  return {
    id,
    alt,
    width: 800,
    height: 600,
    originalExt: 'webp',
    uploadedAt: '2026-09-07T23:40:00Z',
  };
}

function manifestWithGallery(ids: string[], cover: string | null = null): HouseManifest {
  let manifest = EMPTY_MANIFEST;
  for (const id of ids) {
    manifest = addImage(manifest, image(id));
  }
  return { ...manifest, cover };
}

describe('addImage', () => {
  it('agrega la imagen al final de la galería sin designarla portada', () => {
    const manifest = addImage(EMPTY_MANIFEST, image('a'));

    expect(manifest.gallery).toEqual(['a']);
    expect(manifest.cover).toBeNull();
    expect(manifest.images.a).toEqual({
      alt: '',
      width: 800,
      height: 600,
      originalExt: 'webp',
      uploadedAt: '2026-09-07T23:40:00Z',
    });
  });

  it('conserva el orden de agregado', () => {
    let manifest = addImage(EMPTY_MANIFEST, image('a'));
    manifest = addImage(manifest, image('b'));
    manifest = addImage(manifest, image('c'));

    expect(manifest.gallery).toEqual(['a', 'b', 'c']);
  });
});

describe('setCover', () => {
  it('designa como portada una imagen que no es la primera, sin alterar el orden', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c']);

    const result = setCover(manifest, 'b');

    expect(result.cover).toBe('b');
    expect(result.gallery).toEqual(['a', 'b', 'c']);
  });

  it('rechaza designar como portada un id que no existe', () => {
    const manifest = manifestWithGallery(['a']);

    expect(() => setCover(manifest, 'no-existe')).toThrow(NotFoundError);
  });
});

describe('moveImage', () => {
  it('mover hacia adelante intercambia con la imagen anterior', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c']);

    const result = moveImage(manifest, 'b', 'forward');

    expect(result.gallery).toEqual(['b', 'a', 'c']);
  });

  it('mover hacia atrás intercambia con la imagen siguiente', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c']);

    const result = moveImage(manifest, 'b', 'backward');

    expect(result.gallery).toEqual(['a', 'c', 'b']);
  });

  it('mover hacia adelante la primera imagen no hace nada', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c']);

    const result = moveImage(manifest, 'a', 'forward');

    expect(result.gallery).toEqual(['a', 'b', 'c']);
  });

  it('mover hacia atrás la última imagen no hace nada', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c']);

    const result = moveImage(manifest, 'c', 'backward');

    expect(result.gallery).toEqual(['a', 'b', 'c']);
  });
});

describe('removeImage', () => {
  it('elimina la imagen de la galería y de images, conservando el orden relativo del resto', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c']);

    const result = removeImage(manifest, 'b');

    expect(result.gallery).toEqual(['a', 'c']);
    expect(result.images.b).toBeUndefined();
  });

  it('al eliminar la portada, la portada queda en reserva (null)', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c'], 'b');

    const result = removeImage(manifest, 'b');

    expect(result.cover).toBeNull();
    expect(getEffectiveCoverId(result)).toBe('a');
  });

  it('eliminar una imagen que no es la portada no afecta la portada', () => {
    const manifest = manifestWithGallery(['a', 'b', 'c'], 'a');

    const result = removeImage(manifest, 'b');

    expect(result.cover).toBe('a');
  });

  it('rechaza eliminar un id que no existe', () => {
    const manifest = manifestWithGallery(['a']);

    expect(() => removeImage(manifest, 'no-existe')).toThrow(NotFoundError);
  });
});

describe('setAltText', () => {
  it('actualiza el texto alternativo de una imagen existente', () => {
    const manifest = manifestWithGallery(['a']);

    const result = setAltText(manifest, 'a', 'Vista al mar desde el balcón');

    expect(result.images.a?.alt).toBe('Vista al mar desde el balcón');
  });

  it('rechaza editar el texto alternativo de un id que no existe', () => {
    const manifest = manifestWithGallery(['a']);

    expect(() => setAltText(manifest, 'no-existe', 'texto')).toThrow(NotFoundError);
  });
});

describe('getEffectiveCoverId', () => {
  it('devuelve la portada designada cuando existe', () => {
    const manifest = manifestWithGallery(['a', 'b'], 'b');

    expect(getEffectiveCoverId(manifest)).toBe('b');
  });

  it('devuelve la primera imagen de la galería cuando no hay portada designada', () => {
    const manifest = manifestWithGallery(['a', 'b']);

    expect(getEffectiveCoverId(manifest)).toBe('a');
  });

  it('devuelve null cuando la galería está vacía', () => {
    expect(getEffectiveCoverId(EMPTY_MANIFEST)).toBeNull();
  });
});
