import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOME_HERO_SLUG } from '../home-hero';
import { processUploadBatch } from '../images';
import { deleteOrphans, findOrphans } from './orphans';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'duplexalmar-orphans-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe('findOrphans', () => {
  it('también barre el directorio de la foto principal de inicio', async () => {
    const dir = path.join(dataDir, 'images', HOME_HERO_SLUG);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'huerfano-480.webp'), Buffer.from('huérfano de inicio'));

    const report = await findOrphans(dataDir);

    expect(report.orphans).toHaveLength(1);
    expect(report.orphans[0]).toMatchObject({
      house: HOME_HERO_SLUG,
      fileName: 'huerfano-480.webp',
    });
  });

  it('no reporta nada cuando todos los archivos están referenciados en el manifest', async () => {
    const jpeg = await sharp({
      create: { width: 600, height: 400, channels: 3, background: { r: 200, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    await processUploadBatch(dataDir, 'casa-rosa', [{ clientFileName: 'a.jpg', buffer: jpeg }]);

    const report = await findOrphans(dataDir);

    expect(report.orphans).toEqual([]);
    expect(report.totalSizeBytes).toBe(0);
  });

  it('detecta un archivo huérfano y reporta su tamaño, sin borrarlo', async () => {
    const dir = path.join(dataDir, 'images', 'casa-rosa');
    await mkdir(dir, { recursive: true });
    const orphanPath = path.join(dir, 'huerfano-900.webp');
    await writeFile(orphanPath, Buffer.from('contenido huérfano de prueba'));

    const report = await findOrphans(dataDir);

    expect(report.orphans).toHaveLength(1);
    expect(report.orphans[0]).toMatchObject({
      house: 'casa-rosa',
      fileName: 'huerfano-900.webp',
    });
    expect(report.totalSizeBytes).toBeGreaterThan(0);

    // No borra nada por su cuenta: el archivo sigue ahí.
    await expect(readFile(orphanPath)).resolves.toBeDefined();
  });

  it('no confunde una imagen referenciada de una casa con un huérfano de otra', async () => {
    const jpeg = await sharp({
      create: { width: 480, height: 320, channels: 3, background: { r: 0, g: 200, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    await processUploadBatch(dataDir, 'casa-rosa', [{ clientFileName: 'a.jpg', buffer: jpeg }]);

    const verdeDir = path.join(dataDir, 'images', 'casa-verde');
    await mkdir(verdeDir, { recursive: true });
    await writeFile(path.join(verdeDir, 'suelto-480.webp'), Buffer.from('huérfano en casa-verde'));

    const report = await findOrphans(dataDir);

    expect(report.orphans).toHaveLength(1);
    expect(report.orphans[0]?.house).toBe('casa-verde');
  });
});

describe('deleteOrphans', () => {
  it('elimina sólo los archivos que se le pasan, y no elimina nada si la lista está vacía', async () => {
    const dir = path.join(dataDir, 'images', 'casa-rosa');
    await mkdir(dir, { recursive: true });
    const orphanPath = path.join(dir, 'huerfano-900.webp');
    await writeFile(orphanPath, Buffer.from('contenido'));

    // Confirmación explícita ausente: no se llama a deleteOrphans, el
    // huérfano detectado sigue en disco.
    const report = await findOrphans(dataDir);
    await expect(readFile(orphanPath)).resolves.toBeDefined();

    // Con la confirmación (la llamada explícita), recién ahí se borra.
    await deleteOrphans(report.orphans);
    await expect(readFile(orphanPath)).rejects.toThrow();
  });
});
