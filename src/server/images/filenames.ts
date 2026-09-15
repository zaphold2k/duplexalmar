import type { ImageFormat } from './detect-format';

/**
 * Convención de nombres compartida entre el almacenamiento en disco
 * (storage.ts) y las URLs públicas (urls.ts): un único lugar que la define.
 */

function originalExtension(format: ImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export function originalFileName(id: string, format: ImageFormat): string {
  return `${id}.orig.${originalExtension(format)}`;
}

export function variantFileName(id: string, width: number): string {
  return `${id}-${String(width)}.webp`;
}
