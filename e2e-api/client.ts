import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME, E2E_BASE_URL } from '../e2e/env';

/**
 * Helpers HTTP puros (sin browser, sin Playwright) para ejercer el server
 * real igual que lo hace el cliente del panel: login por form-POST, acciones
 * por fetch autenticado, y lectura de HTML publicado para verificar que el
 * sitio refleja el cambio sin redeploy (ver e2e/global-setup.ts, que ya usa
 * el mismo patrón para el estado inicial).
 */

export async function login(): Promise<string> {
  const body = new URLSearchParams({ username: E2E_ADMIN_USERNAME, password: E2E_ADMIN_PASSWORD });
  const response = await fetch(`${E2E_BASE_URL}/admin/login`, {
    method: 'POST',
    body,
    redirect: 'manual',
    headers: { origin: E2E_BASE_URL },
  });
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Login falló: la respuesta no trajo cookie de sesión.');
  }
  return setCookie.split(';')[0] ?? '';
}

export async function apiPost(
  path: string,
  cookie: string | null,
  form: FormData,
): Promise<Response> {
  return fetch(`${E2E_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    headers: { origin: E2E_BASE_URL, ...(cookie ? { cookie } : {}) },
  });
}

export async function getHtml(path: string, cookie?: string): Promise<string> {
  const response = await fetch(`${E2E_BASE_URL}${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return response.text();
}

export function fileForm(
  fieldName: string,
  name: string,
  mimeType: string,
  buffer: Buffer,
): FormData {
  const form = new FormData();
  form.set(fieldName, new Blob([new Uint8Array(buffer)], { type: mimeType }), name);
  return form;
}
