import sharp, { type Metadata, type Sharp } from 'sharp';
import type { ImageFormat } from './detect-format';
import { decodeHeic } from './heic-decoder';

export const VARIANT_WIDTHS = [480, 900, 1600, 2400] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

export interface ImageVariant {
  width: VariantWidth;
  buffer: Buffer;
}

export interface ProcessedImage {
  /** Dimensiones ya corregidas por orientación. */
  width: number;
  height: number;
  /** Variantes WebP para los anchos que no superan el original, de menor a mayor. */
  variants: ImageVariant[];
}

function orientedDimensions(meta: Metadata): { width: number; height: number } {
  // `sharp` ya expone las dimensiones con la orientación EXIF aplicada.
  return meta.autoOrient;
}

interface OrientedSource {
  pipeline: Sharp;
  width: number;
  height: number;
}

async function toOrientedSource(buffer: Buffer, format: ImageFormat): Promise<OrientedSource> {
  if (format === 'heic') {
    const { width, height, data } = await decodeHeic(buffer);
    // libheif ya aplica la orientación nativa de HEIF (irot/imir) al decodificar:
    // los píxeles crudos que devuelve no llevan ningún tag EXIF de orientación
    // pendiente, así que no hace falta (ni es posible) volver a rotarlos.
    const pipeline = sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
      raw: { width, height, channels: 4 },
    });
    return { pipeline, width, height };
  }

  const meta = await sharp(buffer).metadata();
  const { width, height } = orientedDimensions(meta);
  const pipeline = sharp(buffer).rotate();
  return { pipeline, width, height };
}

/**
 * Procesa una imagen subida: aplica la orientación EXIF (o la de HEIF, según el
 * formato), elimina toda la metadata de la salida —incluida la geolocalización,
 * que `sharp` no copia a menos que se pida explícitamente con `withMetadata`— y
 * genera las variantes WebP que quepan sin agrandar el original.
 */
export async function processImage(buffer: Buffer, format: ImageFormat): Promise<ProcessedImage> {
  const { pipeline, width, height } = await toOrientedSource(buffer, format);
  const applicableWidths = VARIANT_WIDTHS.filter((variantWidth) => variantWidth <= width);

  const variants: ImageVariant[] = [];
  for (const variantWidth of applicableWidths) {
    // Cada variante clona el pipeline: una instancia de sharp se consume al procesarse.
    const variantBuffer = await pipeline
      .clone()
      .resize({ width: variantWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    variants.push({ width: variantWidth, buffer: variantBuffer });
  }

  return { width, height, variants };
}
