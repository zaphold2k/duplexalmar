export type GuardDecision = 'allow' | 'redirect-login' | 'unauthorized';

const LOGIN_PATH = '/admin/login';

function isPanelPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isProtectedApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/admin');
}

/**
 * Decide el acceso a una ruta según si hay una sesión válida.
 *
 * - `/admin/login` es siempre pública (si no, nadie podría loguearse).
 * - El resto de `/admin/**` (el panel) redirige al login sin sesión.
 * - `/api/admin/**` (los endpoints de escritura) responde no autorizado sin
 *   sesión, sin llegar nunca al handler que modificaría el estado.
 * - Cualquier otra ruta (el sitio público) no requiere sesión.
 */
export function decideAccess(pathname: string, hasValidSession: boolean): GuardDecision {
  if (pathname === LOGIN_PATH) return 'allow';
  if (hasValidSession) return 'allow';
  if (isProtectedApiPath(pathname)) return 'unauthorized';
  if (isPanelPath(pathname)) return 'redirect-login';
  return 'allow';
}
