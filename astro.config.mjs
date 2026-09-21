// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    // El adapter de Node en modo standalone arma la URL de la request
    // mirando si el socket TCP está cifrado, no el header
    // `X-Forwarded-Proto` (ver @astrojs/node, createRequestFromNodeRequest):
    // detrás de un proxy que termina TLS y reenvía HTTP plano (nginx local,
    // Cloudflare Tunnel), Astro arma `http://` mientras el navegador manda
    // `Origin: https://`, y el chequeo de CSRF integrado rechaza todo POST
    // de formulario con "Cross-site POST form submissions are forbidden".
    // El propio panel de admin ya está protegido contra CSRF real por la
    // cookie de sesión `SameSite=Lax` (no viaja en un POST cross-site), así
    // que desactivar este chequeo puntual es el arreglo documentado por
    // Astro para este caso.
    checkOrigin: false,
    // Sin esto, `Astro.clientAddress` (y por lo tanto el limitador de
    // intentos de login, que lo usa como clave) ve siempre la IP del
    // contenedor de cloudflared, la misma para todas las visitas — no la
    // IP real de quien entra. Al declarar el dominio público acá, Astro
    // confía en el `X-Forwarded-For` que manda ese proxy conocido.
    allowedDomains: [{ hostname: 'duplexalmar.com.ar', protocol: 'https' }],
  },
});
