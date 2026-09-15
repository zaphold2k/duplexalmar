import { NotFoundError } from '../../lib/errors';
import type { HouseImage, HouseManifest } from './manifest-schema';

export interface NewHouseImage extends HouseImage {
  id: string;
}

/** Agrega una imagen al final de la galería. No la designa portada. */
export function addImage(manifest: HouseManifest, image: NewHouseImage): HouseManifest {
  const { id, ...rest } = image;
  return {
    ...manifest,
    gallery: [...manifest.gallery, id],
    images: { ...manifest.images, [id]: rest },
  };
}

function requireImage(manifest: HouseManifest, imageId: string): void {
  if (!(imageId in manifest.images)) {
    throw new NotFoundError(`No existe una imagen con id "${imageId}" en esta casa`);
  }
}

/** Designa una imagen existente como portada. Rechaza un id que no está en la galería. */
export function setCover(manifest: HouseManifest, imageId: string): HouseManifest {
  requireImage(manifest, imageId);
  return { ...manifest, cover: imageId };
}

export type MoveDirection = 'forward' | 'backward';

/**
 * Mueve una imagen un lugar hacia adelante (intercambia con la anterior) o hacia
 * atrás (intercambia con la siguiente). En un extremo de la galería, no hace nada.
 */
export function moveImage(
  manifest: HouseManifest,
  imageId: string,
  direction: MoveDirection,
): HouseManifest {
  requireImage(manifest, imageId);
  const index = manifest.gallery.indexOf(imageId);
  const targetIndex = direction === 'forward' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= manifest.gallery.length) {
    return manifest;
  }

  const gallery = [...manifest.gallery];
  const neighbor = gallery[targetIndex];
  const current = gallery[index];
  if (neighbor === undefined || current === undefined) {
    return manifest;
  }
  gallery[targetIndex] = current;
  gallery[index] = neighbor;

  return { ...manifest, gallery };
}

/**
 * Elimina una imagen de la galería. Si era la portada, la portada queda en
 * reserva (`null`): el consumidor aplica la regla de "primera de la galería"
 * (ver spec galeria-casas, "Portada eliminada").
 */
export function removeImage(manifest: HouseManifest, imageId: string): HouseManifest {
  requireImage(manifest, imageId);
  const images = Object.fromEntries(
    Object.entries(manifest.images).filter(([id]) => id !== imageId),
  );
  return {
    ...manifest,
    gallery: manifest.gallery.filter((id) => id !== imageId),
    images,
    cover: manifest.cover === imageId ? null : manifest.cover,
  };
}

/** Edita el texto alternativo de una imagen existente. */
export function setAltText(manifest: HouseManifest, imageId: string, alt: string): HouseManifest {
  requireImage(manifest, imageId);
  const existing = manifest.images[imageId];
  if (existing === undefined) {
    throw new NotFoundError(`No existe una imagen con id "${imageId}" en esta casa`);
  }
  return {
    ...manifest,
    images: { ...manifest.images, [imageId]: { ...existing, alt } },
  };
}

/**
 * Portada efectiva a mostrar: la designada, o si no hay ninguna, la primera de
 * la galería (ver spec galeria-casas, "Casa sin portada designada").
 */
export function getEffectiveCoverId(manifest: HouseManifest): string | null {
  return manifest.cover ?? manifest.gallery[0] ?? null;
}
