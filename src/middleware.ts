import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE_NAME, sessionStore, verifySignedValue } from './server/auth';
import { decideAccess } from './server/auth/guard';
import { config } from './server/config';
import { applyPublicCacheHeaders } from './server/http/cache-headers';

export const onRequest = defineMiddleware(async (context, next) => {
  const cookieValue = context.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  const sessionId =
    cookieValue !== null ? verifySignedValue(cookieValue, config.session.secret) : null;
  const hasValidSession = sessionId !== null && sessionStore.get(sessionId, Date.now()) !== null;

  const decision = decideAccess(context.url.pathname, hasValidSession);

  if (decision === 'redirect-login') {
    return context.redirect('/admin/login');
  }

  if (decision === 'unauthorized') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await next();
  return applyPublicCacheHeaders(context.url.pathname, response);
});
