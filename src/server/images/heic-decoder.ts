import decode from 'heic-decode';

export interface DecodedPixels {
  width: number;
  height: number;
  /** Píxeles RGBA sin comprimir, en el orden que espera `sharp` como entrada `raw`. */
  data: Uint8ClampedArray;
}

/**
 * Decodifica un HEIC a píxeles crudos. Aislado detrás de esta interfaz mínima
 * porque `sharp`/`libvips` no decodifica HEIF en sus binarios precompilados
 * (ver design.md, decisión 3); si el día de mañana se cambia de librería o se
 * compila `libvips` con `libheif`, sólo este módulo cambia.
 */
export async function decodeHeic(buffer: Buffer): Promise<DecodedPixels> {
  const { width, height, data } = await decode({ buffer });
  return { width, height, data };
}
