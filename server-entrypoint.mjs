// Punto de entrada de producción. No es un artefacto generado por `astro
// build` (eso es `dist/server/entry.mjs`): existe para agregar el apagado
// prolijo ante SIGTERM que el adapter de Node no trae solo (ver CODESTYLE
// §5, "El proceso maneja SIGTERM terminando las peticiones en curso antes
// de salir"). Requiere ASTRO_NODE_AUTOSTART=disabled para poder controlar
// el arranque del servidor en vez de que se levante solo al importar.
import { startServer } from './dist/server/entry.mjs';

const GRACE_PERIOD_MS = 10_000;

const { server } = startServer();
const httpServer = server.server;

function shutdown(signal) {
  console.error(
    `Señal ${signal} recibida: cerrando el servidor (hasta ${String(GRACE_PERIOD_MS)}ms de gracia)...`,
  );

  httpServer.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Tiempo de gracia agotado: forzando el cierre.');
    process.exit(1);
  }, GRACE_PERIOD_MS).unref();
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
