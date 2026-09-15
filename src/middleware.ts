import { defineMiddleware } from 'astro:middleware';
import { applyPublicCacheHeaders } from './server/http/cache-headers';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  return applyPublicCacheHeaders(context.url.pathname, response);
});
