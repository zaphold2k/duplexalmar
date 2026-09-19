export type ImageFormat = 'jpeg' | 'png' | 'heic';

const HEIC_BRANDS = new Set(['mif1', 'msf1', 'heic', 'heix', 'hevc', 'hevx']);

function readAscii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString('latin1').replace(/\0/g, '').trim();
}

/**
 * Detecta el formato real de una imagen a partir de sus primeros bytes, nunca
 * de la extensión del archivo ni del content-type declarado por el cliente
 * (ver CODESTYLE §4, "Validar en la frontera").
 */
export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (buffer.length >= 12 && readAscii(buffer, 4, 8) === 'ftyp') {
    const brand = readAscii(buffer, 8, 12);
    if (HEIC_BRANDS.has(brand)) {
      return 'heic';
    }
  }

  return null;
}
