import { variantFileName } from './filenames';

/**
 * URL pública de una variante de imagen, servida desde `/images/` (por el
 * proxy en producción, o por `src/pages/images/[house]/[file].ts` en
 * desarrollo — ver design.md, decisión 4 y 11).
 */
export function imageVariantUrl(houseSlug: string, imageId: string, width: number): string {
  return `/images/${houseSlug}/${variantFileName(imageId, width)}`;
}
