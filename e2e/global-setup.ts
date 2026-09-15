import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { processUploadBatch } from '../src/server/images/batch';

/**
 * Carga fotos reales en `casa-rosa` antes de los tests de navegador, para
 * poder ejercer la galería y el lightbox (tarea 5.4) contra datos reales en
 * vez de con el manifest vacío. Usa el mismo `DATA_DIR` que `npm run dev`
 * (ver .env); `global-teardown.ts` lo limpia al terminar.
 */
export default async function globalSetup(): Promise<void> {
  const fixturePath = path.join(process.cwd(), 'src/server/images/fixtures/sample.heic');
  const buffer = await readFile(fixturePath);
  const dataDir = path.join(process.cwd(), 'data');

  await processUploadBatch(dataDir, 'casa-rosa', [
    { clientFileName: 'foto-1.heic', buffer },
    { clientFileName: 'foto-2.heic', buffer },
    { clientFileName: 'foto-3.heic', buffer },
  ]);
}
