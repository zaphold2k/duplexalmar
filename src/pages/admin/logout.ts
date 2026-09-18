import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, sessionStore, verifySignedValue } from '../../server/auth';
import { config } from '../../server/config';

export const POST: APIRoute = ({ cookies, redirect }) => {
  const cookieValue = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieValue) {
    const sessionId = verifySignedValue(cookieValue, config.session.secret);
    if (sessionId) {
      sessionStore.destroy(sessionId);
    }
  }
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  return redirect('/admin/login');
};
