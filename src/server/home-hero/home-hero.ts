import {
  EMPTY_MANIFEST,
  getEffectiveCoverId,
  readManifest,
  writeManifest,
  type HouseImage,
} from '../houses';
import {
  deleteImageFiles,
  processUploadBatch,
  type BatchItemResult,
  type UploadedFile,
} from '../images';

/**
 * Slug reservado bajo el que vive la foto principal de inicio, reusando el
 * manifest y el pipeline de imágenes de una casa (ver design.md de
 * add-portada-inicio, decisión 1). No es una casa: no está en `HOUSE_SLUGS`
 * ni pasa `isHouseSlug`, así que no aparece en la selección de casa del
 * panel ni responde en `/<slug>`. Nada fuera de este módulo construye este
 * valor a mano.
 */
export const HOME_HERO_SLUG = 'inicio';

export interface HomeHeroImage extends HouseImage {
  id: string;
}

export interface ReplaceHomeHeroDeps {
  now?: () => string;
  generateId?: () => string;
  /** Límite de tamaño del archivo, en bytes. Sin tope si se omite. */
  maxFileSizeBytes?: number;
}

/** Foto principal vigente, o `null` si el anfitrión todavía no cargó ninguna. */
export async function getHomeHeroImage(dataDir: string): Promise<HomeHeroImage | null> {
  const manifest = await readManifest(dataDir, HOME_HERO_SLUG);
  const id = getEffectiveCoverId(manifest);
  if (id === null) return null;
  const image = manifest.images[id];
  if (image === undefined) return null;
  return { id, ...image };
}

/**
 * Sube una foto y la deja como única foto principal. Primero procesa y guarda
 * la nueva con el mismo pipeline que una casa; sólo si eso tuvo éxito, deja
 * el manifest con ese único id y recién entonces borra los archivos de la
 * anterior (ver design.md, "Riesgos"): si el procesamiento falla, la vigente
 * no se toca.
 */
export async function replaceHomeHeroImage(
  dataDir: string,
  file: UploadedFile,
  deps: ReplaceHomeHeroDeps = {},
): Promise<BatchItemResult> {
  const [result] = await processUploadBatch(dataDir, HOME_HERO_SLUG, [file], deps);
  if (result === undefined) {
    throw new Error('El procesamiento de la foto principal no devolvió ningún resultado');
  }
  if (result.status === 'failed') return result;

  const manifest = await readManifest(dataDir, HOME_HERO_SLUG);
  const newImage = manifest.images[result.imageId];
  if (newImage === undefined) {
    throw new Error(
      `La foto principal recién procesada (${result.imageId}) no está en el manifest`,
    );
  }
  const previousIds = Object.keys(manifest.images).filter((id) => id !== result.imageId);

  // El manifest se actualiza antes de borrar archivos: el peor caso es un
  // huérfano recuperable, nunca una referencia rota en el sitio público.
  await writeManifest(dataDir, HOME_HERO_SLUG, {
    version: 1,
    cover: result.imageId,
    gallery: [result.imageId],
    images: { [result.imageId]: newImage },
  });
  for (const id of previousIds) {
    await deleteImageFiles(dataDir, HOME_HERO_SLUG, id);
  }

  return result;
}

/** Quita la foto principal vigente. Sin foto cargada, no hace nada. */
export async function deleteHomeHeroImage(dataDir: string): Promise<void> {
  const manifest = await readManifest(dataDir, HOME_HERO_SLUG);
  const ids = Object.keys(manifest.images);
  if (ids.length === 0) return;

  await writeManifest(dataDir, HOME_HERO_SLUG, EMPTY_MANIFEST);
  for (const id of ids) {
    await deleteImageFiles(dataDir, HOME_HERO_SLUG, id);
  }
}
