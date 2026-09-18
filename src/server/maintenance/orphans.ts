import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { HOUSE_SLUGS } from '../../content/houses';
import { HOME_HERO_SLUG } from '../home-hero';
import { readManifest } from '../houses';

export interface OrphanFile {
  house: string;
  fileName: string;
  path: string;
  sizeBytes: number;
}

export interface OrphanReport {
  orphans: OrphanFile[];
  totalSizeBytes: number;
}

/** El id es la parte del nombre antes del primer `.` o `-` (lo que venga primero). */
function extractIdFromFileName(fileName: string): string {
  const dashIndex = fileName.indexOf('-');
  const dotIndex = fileName.indexOf('.');
  const candidates = [dashIndex, dotIndex].filter((i) => i !== -1);
  if (candidates.length === 0) return fileName;
  return fileName.slice(0, Math.min(...candidates));
}

/**
 * Lista los archivos bajo `/data/images/<casa>/` que ningún manifest
 * referencia (ver design.md, decisión 5: "el manifest es la fuente de
 * verdad"). Incluye el directorio de la foto principal de inicio, que reusa
 * el mismo manifest bajo un slug reservado. No borra nada; sólo reporta.
 */
export async function findOrphans(dataDir: string): Promise<OrphanReport> {
  const orphans: OrphanFile[] = [];
  let totalSizeBytes = 0;

  for (const house of [...HOUSE_SLUGS, HOME_HERO_SLUG]) {
    const manifest = await readManifest(dataDir, house);
    const knownIds = new Set(Object.keys(manifest.images));
    const dir = path.join(dataDir, 'images', house);

    let fileNames: string[];
    try {
      fileNames = await readdir(dir);
    } catch {
      continue;
    }

    for (const fileName of fileNames) {
      const id = extractIdFromFileName(fileName);
      if (knownIds.has(id)) continue;

      const filePath = path.join(dir, fileName);
      const stats = await stat(filePath);
      orphans.push({ house, fileName, path: filePath, sizeBytes: stats.size });
      totalSizeBytes += stats.size;
    }
  }

  return { orphans, totalSizeBytes };
}

/** Borra los huérfanos indicados. Requiere que el llamador ya haya confirmado. */
export async function deleteOrphans(orphans: readonly OrphanFile[]): Promise<void> {
  await Promise.all(orphans.map((orphan) => rm(orphan.path, { force: true })));
}
