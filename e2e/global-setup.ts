import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { processUploadBatch } from '../src/server/images/batch';
import {
  E2E_ADMIN_PASSWORD as ADMIN_PASSWORD,
  E2E_ADMIN_USERNAME as ADMIN_USERNAME,
  E2E_BASE_URL as BASE_URL,
  E2E_DATA_DIR,
} from './env';

async function loginAndGetSessionCookie(): Promise<string> {
  const body = new URLSearchParams({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  const response = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    body,
    redirect: 'manual',
    headers: { origin: BASE_URL },
  });
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('El login del setup de e2e no devolvió una cookie de sesión.');
  }
  return setCookie.split(';')[0] ?? '';
}

/**
 * Verifica el estado vacío (tareas 5.2/5.3: manifest vacío → imagen de
 * reserva; y el panel, tarea 7.1: la galería vacía se refleja como tal)
 * antes de subir ninguna foto a ninguna casa. Tiene que vivir acá y no en un
 * test común: es el único momento en que ambas casas están genuinamente
 * vacías, antes de que este mismo setup siembre `casa-rosa` y el
 * `beforeAll` de `admin-panel.spec.ts` siembre `casa-verde`.
 */
async function assertEmptyStateShowsReserveImage(): Promise<void> {
  const homeHtml = await (await fetch(`${BASE_URL}/`)).text();
  if (!homeHtml.includes('/images/reserve-cover.jpg')) {
    throw new Error('La home no muestra la imagen de reserva con el manifest vacío (tarea 5.2).');
  }

  const casaHtml = await (await fetch(`${BASE_URL}/casa-verde`)).text();
  if (!casaHtml.includes('house-hero__image') || !casaHtml.includes('/images/reserve-cover.jpg')) {
    throw new Error(
      'La página de casa-verde no muestra la imagen de reserva con el manifest vacío (tarea 5.3).',
    );
  }

  const sessionCookie = await loginAndGetSessionCookie();
  const panelHtml = await (
    await fetch(`${BASE_URL}/admin/casa-verde`, { headers: { cookie: sessionCookie } })
  ).text();
  if (!panelHtml.includes('(vacía)')) {
    throw new Error('El panel no refleja la galería vacía de casa-verde (tarea 7.1).');
  }
}

/**
 * Carga fotos reales en `casa-rosa` antes de los tests de navegador, para
 * poder ejercer la galería y el lightbox (tarea 5.4) contra datos reales en
 * vez de con el manifest vacío. Escribe en `E2E_DATA_DIR` (nunca en el
 * `./data` de desarrollo); `global-teardown.ts` lo limpia al terminar.
 */
export default async function globalSetup(): Promise<void> {
  await assertEmptyStateShowsReserveImage();

  const fixturePath = path.join(process.cwd(), 'src/server/images/fixtures/sample.heic');
  const buffer = await readFile(fixturePath);

  await processUploadBatch(E2E_DATA_DIR, 'casa-rosa', [
    { clientFileName: 'foto-1.heic', buffer },
    { clientFileName: 'foto-2.heic', buffer },
    { clientFileName: 'foto-3.heic', buffer },
  ]);
}
