import { rm } from 'node:fs/promises';
import { E2E_DATA_DIR } from './env';

/**
 * Borra sólo el directorio de datos de la suite. El `./data` de desarrollo
 * no se toca: lo que se cargó desde el panel a mano sobrevive a las e2e.
 */
export default async function globalTeardown(): Promise<void> {
  await rm(E2E_DATA_DIR, { recursive: true, force: true });
}
