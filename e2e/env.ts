import path from 'node:path';

/**
 * Parámetros compartidos por la suite e2e. Centralizados acá para que los
 * tests no toquen nunca el `./data` de desarrollo (el que llena `npm run
 * dev` o el panel a mano): la suite arranca vacía, siembra lo que necesita
 * y `global-teardown.ts` borra el directorio al terminar.
 *
 * - `E2E_DATA_DIR`: directorio de datos exclusivo de la suite, en el host.
 *   El server bajo prueba tiene que usar el mismo: el local lo recibe por
 *   `DATA_DIR` (ver `webServer.env` en playwright.config.ts); el de Docker
 *   lo monta como `/data` (ver docker-compose.e2e.yml).
 * - `E2E_BASE_URL`: dónde escuchar el server. Sin la variable, Playwright
 *   levanta uno local en 4321; con ella (p. ej. `npm run test:e2e:docker`)
 *   usa el que ya está corriendo ahí.
 * - Credenciales del panel: las de `.env` (modo local) y de `.env.e2e`
 *   (modo Docker) tienen que coincidir con estas.
 */
export const E2E_DATA_DIR = path.join(process.cwd(), 'data-e2e');
export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4321';
export const E2E_ADMIN_USERNAME = 'admin';
export const E2E_ADMIN_PASSWORD = 'prueba-123';
