import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectImageFormat } from './detect-format';

const fixturePath = path.join(import.meta.dirname, 'fixtures', 'sample.heic');

describe('detectImageFormat', () => {
  it('detecta JPEG por su firma de bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    expect(detectImageFormat(jpeg)).toBe('jpeg');
  });

  it('detecta PNG por su firma de bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

    expect(detectImageFormat(png)).toBe('png');
  });

  it('detecta HEIC leyendo el archivo real de prueba', async () => {
    const buffer = await readFile(fixturePath);

    expect(detectImageFormat(buffer)).toBe('heic');
  });

  it('rechaza un archivo que no es una imagen, aunque su contenido sea texto', () => {
    const notAnImage = Buffer.from('esto no es una imagen, es texto plano', 'utf-8');

    expect(detectImageFormat(notAnImage)).toBeNull();
  });

  it('detecta por contenido, no por el nombre o la extensión engañosa del archivo', () => {
    // Un archivo de texto renombrado con extensión .jpg sigue sin ser una imagen:
    // la función no recibe ni consulta el nombre del archivo en ningún momento.
    const fakeJpeg = Buffer.from('contenido arbitrario con extensión engañosa', 'utf-8');

    expect(detectImageFormat(fakeJpeg)).toBeNull();
  });

  it('rechaza un buffer vacío o demasiado corto para tener una firma válida', () => {
    expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
    expect(detectImageFormat(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
