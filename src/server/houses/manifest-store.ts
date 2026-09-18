import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EMPTY_MANIFEST, parseManifest, type HouseManifest } from './manifest-schema';

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function manifestPath(dataDir: string, houseSlug: string): string {
  return path.join(dataDir, 'houses', `${houseSlug}.json`);
}

/**
 * Lee el manifest de una casa. Si el archivo no existe todavía —la casa nunca
 * recibió una foto— devuelve el estado vacío en lugar de fallar (ver spec
 * galeria-casas, "Estado inicial y vacío").
 */
export async function readManifest(dataDir: string, houseSlug: string): Promise<HouseManifest> {
  const filePath = manifestPath(dataDir, houseSlug);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return EMPTY_MANIFEST;
    }
    throw error;
  }
  return parseManifest(JSON.parse(raw));
}

// Serializa las escrituras por casa dentro de este proceso: el mutex es la cola de
// promesas encadenadas para esa ruta. Cada entrada nunca rechaza, para que un fallo
// de un escritor no deje a los siguientes esperando para siempre (ver design.md §2).
const writeQueues = new Map<string, Promise<void>>();

async function withWriteLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const settled = previous.then(task, task);
  writeQueues.set(
    key,
    settled.then(
      () => undefined,
      () => undefined,
    ),
  );
  return settled;
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  // Archivo temporal en el mismo directorio: el rename es atómico sólo dentro del
  // mismo sistema de archivos.
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );
  await writeFile(tmpPath, contents, 'utf-8');
  await rename(tmpPath, filePath);
}

/**
 * Escribe el manifest de una casa de forma atómica (archivo temporal + rename) y
 * serializada por casa con un mutex en proceso, para que escrituras concurrentes
 * no se pisen entre sí.
 */
export async function writeManifest(
  dataDir: string,
  houseSlug: string,
  manifest: HouseManifest,
): Promise<void> {
  const filePath = manifestPath(dataDir, houseSlug);
  const contents = JSON.stringify(manifest, null, 2);
  await withWriteLock(filePath, () => atomicWrite(filePath, contents));
}
