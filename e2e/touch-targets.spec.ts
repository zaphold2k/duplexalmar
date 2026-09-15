import { expect, test, type Page } from '@playwright/test';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'prueba-123';

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Usuario').fill(VALID_USERNAME);
  await page.getByLabel('Contraseña').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

interface TargetIssue {
  tag: string;
  text: string;
  width: number;
  height: number;
  reason: 'too-small' | 'no-accessible-name';
}

/**
 * Objetivos táctiles ≥ 44×44px CSS y ningún control sin nombre accesible
 * (texto visible o aria-label) — ver spec sitio-publico y admin-imagenes.
 */
async function findTouchTargetIssues(page: Page): Promise<TargetIssue[]> {
  return page.evaluate(() => {
    const MIN_SIZE = 44;
    const EPSILON = 0.5; // tolerancia por redondeo de sub-píxel
    const selector =
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]';
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const issues: TargetIssue[] = [];

    for (const el of elements) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.hidden) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // no renderizado

      // Nombre accesible aproximado: aria-label, aria-labelledby, <label for>,
      // <label> que lo envuelve (el caso de los campos del panel) o su propio
      // texto. No es el algoritmo completo de accname, pero cubre los casos
      // reales del sitio sin necesitar una librería aparte.
      let accessibleName = (el.getAttribute('aria-label') ?? '').trim();
      if (!accessibleName) {
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
          accessibleName = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? '')
            .join(' ')
            .trim();
        }
      }
      if (!accessibleName && el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        accessibleName = (label?.textContent ?? '').trim();
      }
      if (!accessibleName) {
        const wrappingLabel = el.closest('label');
        accessibleName = (wrappingLabel?.textContent ?? '').trim();
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ver comentario arriba
      if (!accessibleName) accessibleName = (el.textContent ?? '').trim();
      if (accessibleName.length === 0) {
        issues.push({
          tag: el.tagName,
          text: el.outerHTML.slice(0, 120),
          width: rect.width,
          height: rect.height,
          reason: 'no-accessible-name',
        });
        continue;
      }

      if (rect.width + EPSILON < MIN_SIZE || rect.height + EPSILON < MIN_SIZE) {
        issues.push({
          tag: el.tagName,
          text: accessibleName,
          width: rect.width,
          height: rect.height,
          reason: 'too-small',
        });
      }
    }

    return issues;
  });
}

test.describe('objetivos táctiles y etiquetado de controles', () => {
  const publicPages = ['/', '/casa-rosa', '/casa-verde', '/ubicacion', '/admin/login'];

  for (const path of publicPages) {
    test(`${path}: todos los controles miden al menos 44×44px y tienen nombre accesible`, async ({
      page,
    }) => {
      await page.goto(path);
      const issues = await findTouchTargetIssues(page);

      expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
    });
  }

  test('/admin: todos los controles miden al menos 44×44px y tienen nombre accesible', async ({
    page,
  }) => {
    await login(page);
    const issues = await findTouchTargetIssues(page);

    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  test('/admin/casa-verde: todos los controles miden al menos 44×44px y tienen nombre accesible', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/casa-verde');
    const issues = await findTouchTargetIssues(page);

    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });
});
