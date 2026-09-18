import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeHeic } from './heic-decoder';

const fixturePath = path.join(import.meta.dirname, 'fixtures', 'sample.heic');

describe('decodeHeic', () => {
  it('procesa un archivo HEIC real y devuelve píxeles RGBA consistentes con sus dimensiones', async () => {
    const buffer = await readFile(fixturePath);

    const result = await decodeHeic(buffer);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBe(result.width * result.height * 4);
  });

  it('rechaza un buffer que no es un HEIC válido', async () => {
    const notHeic = Buffer.from('esto no es un HEIC', 'utf-8');

    await expect(decodeHeic(notHeic)).rejects.toThrow();
  });
});
