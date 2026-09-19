import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOUSE_SLUGS, isHouseSlug } from '../../content/houses';
import { readManifest } from '../houses';
import {
  deleteHomeHeroImage,
  getHomeHeroImage,
  HOME_HERO_SLUG,
  replaceHomeHeroImage,
} from './home-hero';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'duplexalmar-home-hero-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

async function validJpeg(background: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width: 600, height: 400, channels: 3, background } })
    .jpeg()
    .toBuffer();
}

function sequentialIds(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `hero-${String(counter)}`;
  };
}

async function heroFiles(): Promise<string[]> {
  try {
    return await readdir(path.join(dataDir, 'images', HOME_HERO_SLUG));
  } catch {
    return [];
  }
}

describe('HOME_HERO_SLUG', () => {
  it('es un slug reservado que no se cuela como una casa', () => {
    expect(isHouseSlug(HOME_HERO_SLUG)).toBe(false);
    expect(HOUSE_SLUGS as readonly string[]).not.toContain(HOME_HERO_SLUG);
  });
});

describe('getHomeHeroImage', () => {
  it('devuelve null sin lanzar cuando todavía no hay manifest en disco', async () => {
    await expect(getHomeHeroImage(dataDir)).resolves.toBeNull();
  });
});

describe('replaceHomeHeroImage', () => {
  it('la primera carga deja el manifest con un solo id, designado como portada', async () => {
    const result = await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'hero.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { generateId: sequentialIds(), now: () => '2026-09-18T00:00:00.000Z' },
    );

    expect(result).toEqual({ clientFileName: 'hero.jpg', status: 'uploaded', imageId: 'hero-1' });

    const manifest = await readManifest(dataDir, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual(['hero-1']);
    expect(manifest.cover).toBe('hero-1');
    expect(Object.keys(manifest.images)).toEqual(['hero-1']);

    const current = await getHomeHeroImage(dataDir);
    expect(current).toMatchObject({ id: 'hero-1', width: 600, height: 400 });
  });

  it('un reemplazo deja sólo la nueva y borra los archivos de la anterior, sin huérfanos', async () => {
    const generateId = sequentialIds();
    await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'primera.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { generateId },
    );
    expect((await heroFiles()).some((name) => name.startsWith('hero-1'))).toBe(true);

    await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'segunda.jpg', buffer: await validJpeg({ r: 0, g: 200, b: 0 }) },
      { generateId },
    );

    const manifest = await readManifest(dataDir, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual(['hero-2']);
    expect(manifest.images['hero-1']).toBeUndefined();

    const files = await heroFiles();
    expect(files.some((name) => name.startsWith('hero-1'))).toBe(false);
    expect(files.some((name) => name.startsWith('hero-2'))).toBe(true);
  });

  it('un archivo inválido se informa como fallido y no toca la foto vigente ni el manifest', async () => {
    const generateId = sequentialIds();
    await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'vigente.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { generateId },
    );
    const filesBefore = (await heroFiles()).sort();

    const result = await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'no-es-imagen.jpg', buffer: Buffer.from('esto no es una imagen') },
      { generateId },
    );

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.reason).toMatch(/no es una imagen válida/i);
    }

    const manifest = await readManifest(dataDir, HOME_HERO_SLUG);
    expect(manifest.gallery).toEqual(['hero-1']);
    expect((await heroFiles()).sort()).toEqual(filesBefore);
  });

  it('un archivo que supera el límite de tamaño se rechaza nombrando el límite', async () => {
    const result = await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'grande.jpg', buffer: await validJpeg({ r: 0, g: 0, b: 200 }) },
      { maxFileSizeBytes: 10 },
    );

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.reason).toMatch(/límite de tamaño/i);
    }
    await expect(getHomeHeroImage(dataDir)).resolves.toBeNull();
  });
});

describe('deleteHomeHeroImage', () => {
  it('quita la foto vigente: el manifest queda vacío y no quedan archivos', async () => {
    await replaceHomeHeroImage(
      dataDir,
      { clientFileName: 'hero.jpg', buffer: await validJpeg({ r: 200, g: 0, b: 0 }) },
      { generateId: sequentialIds() },
    );

    await deleteHomeHeroImage(dataDir);

    await expect(getHomeHeroImage(dataDir)).resolves.toBeNull();
    expect(await heroFiles()).toEqual([]);
  });

  it('es idempotente: sin foto cargada no falla ni crea nada', async () => {
    await expect(deleteHomeHeroImage(dataDir)).resolves.toBeUndefined();
    await expect(deleteHomeHeroImage(dataDir)).resolves.toBeUndefined();

    await expect(readdir(path.join(dataDir, 'houses'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
