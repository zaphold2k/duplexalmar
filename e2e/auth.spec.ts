import { expect, test } from '@playwright/test';

// Credenciales de desarrollo (ver .env, no commiteado): admin / prueba-123.
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'prueba-123';

async function login(
  page: import('@playwright/test').Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

// Serializado en un solo worker: el limitador de intentos de login es un
// único mapa en memoria por proceso de servidor, con clave por IP de
// origen (ver login-rate-limiter.ts). Todos los tests de este archivo
// llegan desde el mismo loopback, así que comparten esa clave; los tests
// que dependen de un login correcto van antes que los que fuerzan fallos.
test.describe.configure({ mode: 'serial' });

test.describe('acceso sin sesión', () => {
  test('una ruta del panel redirige al inicio de sesión', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('un endpoint de escritura responde no autorizado sin modificar estado', async ({
    request,
    baseURL,
  }) => {
    // Con el Origin que pondría un navegador real, para ejercer nuestro
    // guardia y no la protección CSRF genérica de Astro (que sin Origin
    // responde 403 antes de llegar al middleware).
    const response = await request.post('/api/admin/casa-rosa/upload', {
      headers: { origin: baseURL ?? 'http://localhost:4321' },
    });

    expect(response.status()).toBe(401);
  });

  test('el inicio de sesión es accesible sin sesión', async ({ page }) => {
    const response = await page.goto('/admin/login');

    expect(response?.status()).toBe(200);
  });
});

test.describe('inicio de sesión correcto', () => {
  test('credenciales correctas: entra al panel', async ({ page }) => {
    await login(page, VALID_USERNAME, VALID_PASSWORD);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
  });

  test('la cookie de sesión es HttpOnly y SameSite=Lax; Secure sólo detrás de TLS', async ({
    page,
    context,
  }) => {
    await login(page, VALID_USERNAME, VALID_PASSWORD);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'session');

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    // `Secure` sigue a `X-Forwarded-Proto` (ver login.astro): acá no hay
    // proxy TLS delante, así que no se marca; con `true` fijo, un navegador
    // real la descartaba sobre HTTP plano en cualquier host que no fuera
    // exactamente "localhost".
    expect(sessionCookie?.secure).toBe(false);
    expect(sessionCookie?.sameSite).toBe('Lax');
  });
});

test.describe('cierre de sesión', () => {
  test('invalida la sesión del lado del servidor: la cookie anterior queda rechazada', async ({
    page,
    context,
  }) => {
    await login(page, VALID_USERNAME, VALID_PASSWORD);
    const cookiesBeforeLogout = await context.cookies();
    const sessionCookie = cookiesBeforeLogout.find((c) => c.name === 'session');
    expect(sessionCookie).toBeDefined();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    // Simula "volver atrás" con la cookie vieja todavía en el navegador: se
    // fuerza a que esa cookie exacta esté presente y se pide /admin de nuevo.
    if (sessionCookie) {
      await context.addCookies([sessionCookie]);
    }
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe('inicio de sesión con credenciales incorrectas', () => {
  test('usuario incorrecto y contraseña incorrecta muestran el mismo mensaje de error', async ({
    page,
  }) => {
    await login(page, 'usuario-que-no-existe', VALID_PASSWORD);
    const messageForBadUsername = await page.getByRole('alert').textContent();

    await login(page, VALID_USERNAME, 'contraseña-incorrecta');
    const messageForBadPassword = await page.getByRole('alert').textContent();

    expect(messageForBadUsername).not.toBeNull();
    expect(messageForBadUsername).toBe(messageForBadPassword);
  });

  test('credenciales incorrectas no establecen sesión', async ({ page, context }) => {
    await login(page, VALID_USERNAME, 'contraseña-incorrecta');

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'session')).toBeUndefined();
  });
});
