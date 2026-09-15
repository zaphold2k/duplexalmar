# Guía de estilo de código

Reglas para todo el código de este repositorio. Son obligatorias: `npm run check` las hace cumplir donde una herramienta puede hacerlo, y la revisión de PR cubre el resto. Cuando una regla y una situación concreta chocan, se documenta la excepción en el PR, no se ignora la regla en silencio.

Stack de referencia: Astro en modo servidor, TypeScript, Node.js. Ver `openspec/changes/*/design.md` para las decisiones de arquitectura que estas reglas acompañan.

## 1. Depurable

El objetivo es que cualquier fallo en producción se pueda reconstruir desde los logs, sin reproducirlo a mano.

- **Ningún error se traga.** Toda excepción capturada se relanza con contexto (`new Error(msg, { cause })`) o se registra con los datos necesarios para reproducirla: casa, id de imagen, operación, id de petición. Un `catch` vacío es un bug.
- **Un único logger** con niveles (`debug`, `info`, `warn`, `error`) y campos estructurados. Nada de `console.log` en rutas de producción. Cada petición HTTP lleva un identificador que aparece en todos sus logs.
- **Errores esperados son tipos propios.** Validación, no autorizado, no encontrado y conflicto tienen clases de error específicas que las rutas traducen a estado HTTP. Lo inesperado llega al manejador global, que lo registra completo y responde 500 sin filtrar detalles al cliente.
- **Sin fallbacks silenciosos.** Si el código degrada a un valor de reserva (portada de reserva, alt text de reserva, variante omitida), lo dice en el log al nivel que corresponda.
- **Lógica de dominio pura.** Las operaciones sobre el manifest y las decisiones del pipeline de imágenes son funciones sin I/O, para que se prueben sin disco ni red. Reloj, generador de ids y sistema de archivos se inyectan como dependencias.
- **Fallar al arrancar, no en la primera petición.** La configuración se valida por completo al iniciar; si falta o es inválida, el proceso termina nombrando la variable.
- **Estado observable.** Existe un endpoint de salud, y el comando de mantenimiento reporta lo que ve antes de tocar nada.

## 2. Comentarios

- **Explican por qué, nunca qué.** Si el código necesita un comentario para entenderse, primero se reescribe el código. El comentario queda sólo cuando la razón no puede expresarse en el código mismo.
- **Sólo técnicos.** Invariantes, restricciones no obvias ("el rename es atómico sólo dentro del mismo sistema de archivos"), consecuencias de un cambio, y referencia al spec o a la decisión de diseño que lo justifica.
- **Prohibidos:** código comentado, comentarios narrativos que cuentan lo que hace la función línea por línea, `TODO` o `FIXME` sin issue asociado, comentarios que repiten el nombre de la función.
- **JSDoc** sólo en fronteras públicas de módulo, cuando el tipo no alcanza para explicar el contrato (por ejemplo, una precondición o un efecto colateral).
- **Idioma:** identificadores en inglés; comentarios, documentación y mensajes de commit en español, igual que los artefactos de OpenSpec.

## 3. Formateado siempre

- **Prettier y ESLint** (`typescript-eslint` con el preset estricto y el plugin de Astro) con **cero warnings**: el lint corre con `--max-warnings 0`.
- **Un solo comando de verificación:** `npm run check` ejecuta typecheck, lint, verificación de formato y tests. Un hook de pre-commit lo corre; nada se mergea a `main` con `check` en rojo.
- **TypeScript `strict`** más `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. Sin `any`. Sin aserciones de no-nulidad (`!`) salvo con un comentario que explique por qué es seguro. Sin `as` para forzar tipos; si hace falta, se valida con esquema.
- **Sin desactivar reglas en línea** (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`) salvo con justificación en el mismo comentario. `@ts-expect-error` se prefiere a `@ts-ignore` porque falla cuando deja de ser necesario.

## 4. Estructura

- **Capas explícitas y en un solo sentido:**

  ```
  src/pages/      rutas y endpoints: parsean la entrada, llaman a un servicio,
                  mapean el resultado a una respuesta. Nada más.
  src/server/     dominio, un directorio por responsabilidad:
                  config/, houses/, images/, auth/, storage/
  src/lib/        utilidades puras sin conocimiento del dominio
  src/components/ componentes Astro de presentación
  src/content/    contenido tipado de las casas (textos, servicios)
  ```

  `pages` depende de `server`, `server` depende de `lib`, nunca al revés. **Cero lógica de negocio en archivos `.astro`.**

- **Un módulo por responsabilidad**, con exportaciones explícitas desde un `index.ts` por directorio. Sin dependencias circulares; el lint las rechaza.
- **Nombres:** archivos en kebab-case; tipos e interfaces en PascalCase; funciones y variables en camelCase; constantes verdaderas (valores fijos en tiempo de compilación) en UPPER_SNAKE.
- **Configuración centralizada.** `process.env` se lee en un único módulo (`src/server/config`) que valida y exporta un objeto tipado. El resto del código recibe la configuración por parámetro o la importa de ahí; nunca lee el entorno directamente.
- **Validar en la frontera.** Toda entrada externa se valida con esquema antes de usarse: cuerpo y parámetros de peticiones, manifests leídos de disco, variables de entorno, archivos subidos (por contenido real, no por extensión). Nunca se confía en el cliente.
- **Tests junto al código.** Cada módulo de `server/` tiene su archivo `*.test.ts` al lado. Unitarios para la lógica de dominio; de integración para el pipeline de imágenes (con un HEIC real de prueba) y para los endpoints. Un test que necesita más de tres mocks es señal de que el módulo está mal cortado.

## 5. Production ready

- **Sin secretos en el repositorio.** `.env.example` está siempre completo y sin valores reales; `.env` y el directorio de datos están en `.gitignore`. Un secreto commiteado por error se rota, no sólo se borra del historial.
- **Dependencias mínimas y pinneadas.** El lockfile va commiteado. Cada dependencia nueva se justifica en el PR: qué resuelve y por qué no alcanza con lo que hay.
- **Docker:** build multi-etapa, imagen final sin herramientas de build, usuario no root, `.dockerignore` que excluye tests, datos y `.env`. El proceso maneja `SIGTERM` terminando las peticiones en curso antes de salir.
- **HTTP correcto:** códigos de estado semánticos, cabeceras de seguridad (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`), cookies `HttpOnly`/`Secure`/`SameSite`, límites de tamaño en toda entrada.
- **Idempotencia donde importa.** Reintentar una subida o una escritura del manifest no duplica ni corrompe.
- **Commits convencionales** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`), en español, con el "por qué" en el cuerpo cuando no es obvio. PRs chicos, con un objetivo. CI en verde antes de mergear.
