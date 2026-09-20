# Las Petras — Casas de Mar

Sitio de presentación de dos casas de playa en El Marquesado (Mar del Plata) con un panel privado para que el anfitrión mantenga las fotos actualizadas desde el celular, sin deploy. Ver `openspec/changes/add-sitio-duplexalmar/` para la propuesta, el diseño y los specs completos.

Stack: [Astro](https://astro.build) en modo servidor (`output: 'server'`, adapter `@astrojs/node`), TypeScript estricto, sin base de datos — el estado vive en manifests JSON y archivos sobre un volumen (`/data`).

## Desarrollo

Requisitos: Node 22+.

```bash
npm install
cp .env.example .env
# completar .env (ver "Variables de entorno" abajo)
npm run dev
```

El sitio queda en `http://localhost:4321`. El panel está en `/admin`: desde ahí se entra a las fotos de cada casa y se administra la foto principal de inicio (la que se ve a pantalla completa al abrir el sitio; mientras no haya una cargada, se muestra `public/images/reserve-cover.jpg`).

Comandos:

| Comando                                 | Qué hace                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                           | Servidor de desarrollo                                                                                               |
| `npm run build`                         | Build de producción a `dist/`                                                                                        |
| `npm run check`                         | Typecheck + lint + formato + tests unitarios (lo que corre el hook de pre-commit)                                    |
| `npm run test:e2e`                      | Tests de navegador (Playwright) contra el server real; separados de `check` porque arrancan un server y un navegador |
| `npm run test:e2e:docker`               | Los mismos tests, pero contra la imagen de Docker levantada con `docker-compose.e2e.yml` (ver abajo)                 |
| `npm run hash-password -- "contraseña"` | Genera el hash para `ADMIN_PASSWORD_HASH`                                                                            |
| `npm run maintenance`                   | Lista archivos huérfanos en `/data/images/` y el espacio que ocupan, sin borrar nada                                 |
| `npm run maintenance -- --delete`       | Borra los huérfanos listados                                                                                         |

### Tests e2e y el directorio de datos

La suite e2e arranca siempre con las casas vacías, siembra fotos de prueba y **borra su directorio de datos al terminar**. Para que eso nunca alcance a lo que se cargó a mano desde el panel, usa un directorio propio, `./data-e2e` (ver `e2e/env.ts`), y no el `./data` de desarrollo. Hay dos formas de correrla:

- `npm run test:e2e`: Playwright compila y levanta el server local en `4321` con `DATA_DIR=./data-e2e`, usando las credenciales de `.env` (tienen que ser `admin` / `prueba-123`, las que esperan los tests).
- `npm run test:e2e:docker`: levanta la imagen de producción con `docker-compose.e2e.yml` en `127.0.0.1:4322`, corre los tests contra ella y la baja al final, pase lo que pase. Es un compose aparte del de despliegue: se pasa con `-f`, no carga `docker-compose.override.yml` (el que monta `./data`) y usa `.env.e2e`, que sí está commiteado porque sólo tiene credenciales de prueba. Los argumentos extra van a Playwright: `npm run test:e2e:docker -- e2e/whatsapp.spec.ts`.

## Variables de entorno

Ver `.env.example` para la lista completa con comentarios. Resumen:

- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`: credenciales del panel (un solo usuario). El hash se genera con `npm run hash-password`, nunca se guarda la contraseña en texto plano.
- `SESSION_SECRET`: firma la cookie de sesión. Generar con `openssl rand -base64 32`.
- `WHATSAPP_NUMBER`: número del anfitrión en formato internacional, sólo dígitos (ej. `5492235293371`).
- `DATA_DIR`: dónde viven los manifests y las imágenes procesadas. En desarrollo, un directorio local (`./data`); en producción, el punto de montaje del volumen (`/data`).
- `MAX_UPLOAD_FILE_SIZE_MB`, `MAX_UPLOAD_BATCH_SIZE`: límites de subida desde el panel.

El proceso valida esto al arrancar y falla nombrando la variable que falte o sea inválida, en vez de fallar en la primera petición.

## Despliegue con Docker Compose

```bash
cp .env.docker.example .env.docker
# completar .env.docker (ver la nota sobre el escape de $ ahí mismo)
mkdir -p data   # sólo la primera vez, para que quede con el dueño correcto
docker compose up -d --build
```

Esto levanta dos servicios:

- **app**: la aplicación Astro (Node), sin publicar puerto propio.
- **proxy**: nginx en el puerto `8080`, que sirve `/images/` directamente desde el volumen (sin pasar por Node, con caché inmutable de un año) y reenvía el resto a `app`.

`docker-compose.override.yml` se carga solo y monta `/data` como el directorio local `./data` en vez del volumen nombrado, para poder inspeccionar a mano lo que genera una subida. **Importante:** si `./data` no existe todavía, Docker Desktop/Engine lo crea como `root` al montar, y el proceso de la app (usuario `node`, sin privilegios) no va a poder escribir ahí. Crearlo antes (`mkdir -p data`) con el usuario del host evita el problema.

`.env.docker` es un archivo aparte de `.env`: Docker Compose reinterpreta cada `$` de un `env_file` para posible interpolación de variables, lo que corrompe un hash de contraseña (siempre lleva `$` como separador de campos) si no se escribe escapado como `$$`. `.env.docker.example` trae el detalle.

La elección de proxy (nginx acá) y la emisión de certificados TLS para el dominio final quedan para el change de despliegue; esto sólo deja preparado lo que ese diseño exige de esta pieza — ver `openspec/changes/add-sitio-duplexalmar/design.md`, decisión 11.

Para producción, sacar el volumen bind-mount (dejar sólo `docker-compose.yml`, sin el `.override.yml`) para que `/data` sea el volumen nombrado `duplexalmar_data`, gestionado por Docker.

**Importante:** este `docker-compose.yml` es para desarrollo y sigue construyendo la imagen local (`build: .`), no la publicada. No es lo que corre en producción — ver "Ejecutar la imagen en producción" abajo.

## Ejecutar la imagen en producción

Este repositorio no fija ningún host, inventario ni ruta de un entorno concreto: eso vive en el repositorio de despliegue, junto al runbook de las demás apps que administra. Lo que sigue es el contrato que la imagen publicada exige para correr, sea cual sea el entorno que la levante.

| Exigencia            | Valor                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Datos                 | Volumen persistente en `DATA_DIR`, escribible por el uid 1000 (usuario `node` de la imagen)               |
| Configuración          | Variables de entorno de `.env.docker.example`; el proceso falla al arrancar nombrando la que falte o sea inválida |
| Puerto                | `4321` en la red interna; el contenedor no necesita publicar ningún puerto en el host                      |
| Salud                 | El healthcheck de `docker-compose.yml` (petición a la raíz del sitio)                                      |
| Memoria               | Límite explícito, 512 MB, igual que en el compose local                                                    |
| Delante                | Un proxy que termine TLS y reenvíe `X-Forwarded-Proto` y `X-Forwarded-Host`                                |
| Tamaño de petición     | El lote de subida entra en una sola petición; configurar `MAX_UPLOAD_BATCH_SIZE` por debajo del límite del proxy |
| Versión               | La versión que corre es la etiqueta de la imagen; si la app tiene que reportarla, se le pasa por variable de entorno desde el despliegue |

El procedimiento para aplicar una versión (fijarla, ensayar, aplicar, volver atrás) y el runbook completo de esta app viven en el repositorio de despliegue.

## Respaldo y restauración

Todo el contenido mutable —manifests, fotos originales y variantes— vive bajo `/data`. No hay base de datos que respaldar aparte.

**Respaldar:** copiar el directorio `/data` (o el volumen nombrado) a donde corresponda, por ejemplo:

```bash
docker run --rm -v duplexalmar_data:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/duplexalmar-data-$(date +%Y%m%d).tar.gz -C /data .
```

**Restaurar:** descomprimir esa copia sobre `/data` en una instalación limpia (mismo volumen vacío o directorio nuevo) y levantar la app; no hace falta ningún paso adicional, el sitio vuelve a mostrar exactamente las mismas fotos, portadas, orden y foto principal de inicio que tenía al momento de la copia.

```bash
docker run --rm -v duplexalmar_data:/data -v "$(pwd)":/backup alpine \
  tar xzf /backup/duplexalmar-data-20260907.tar.gz -C /data
```

El respaldo periódico de esta copia **fuera** del servidor es responsabilidad operativa de quien despliega; este repositorio deja el contenido reducido a "copiar un directorio", no automatiza dónde guardarlo.

## Mantenimiento: archivos huérfanos

Si una subida se corta a mitad de camino, pueden quedar variantes o el original en disco sin que el manifest los referencie (el manifest es la fuente de verdad; nunca referencia una foto a medio procesar). `npm run maintenance` los lista junto con el espacio que ocupan; `npm run maintenance -- --delete` los borra. No se borra nada automáticamente ni sin haber corrido primero el listado.

## Pautas de fotos para el anfitrión

Para que las fotos nuevas queden parejas con el resto de la galería:

- Luz de día, pero no a pleno mediodía.
- Celular en horizontal y derecho (no inclinado).
- Camas hechas, con la ropa de cama incluida puesta.
- Baños y cocinas despejados de objetos personales.
- El container del predio, fuera de cuadro.
- Por casa, como mínimo: fachada, galería, estar y cocina, cada dormitorio, baño, la vista desde el balcón y la parrilla.

La carga inicial de fotos conviene hacerla directamente desde el iPhone a través del panel, con los archivos originales — no desde un álbum compartido, que entrega copias de resolución reducida.

<!-- ci-workflows:block:start -->
### Pipeline flow (simple branch model)

This repository is a **node** project, publishing `ghcr.io/zaphold2k/duplexalmar`.

Branches: `main` (stable) and branches matching `feature/*` (work).

**Starting a change:** branch from `main`, naming it like `feature/login-oauth`. Open your pull request against `main`.

**What runs on a pull request:** lint, typecheck, tests, build, and the quality ratchet, compared against the last successful run of the target branch. Coverage drops, lost tests, new skips, and new lint suppressions block the merge.

**What each push produces:**
- A push to a branch matching `feature/*` creates a prerelease tag and image tagged with that branch's own moving tag.
- Accepting the release-please proposal on `main` cuts the stable version.
- A branch outside this model runs the checks and produces no tag or image.

**If a check blocks you:** see the reasons in the pull request comment or job summary. Coverage, test-count, and suppression regressions need fixing the regression, not silencing the check; a maintainer can apply the `ci-ratchet-override` label to accept a deliberate exception.
<!-- ci-workflows:block:end -->

## Versiones

No hace falta abrir ningún workflow para cortar una versión:

- **Pre-release:** empujar una rama `feature/*` publica sola una imagen de prueba (`X.Y.Z-alpha.<rama>.N`) con una etiqueta móvil del nombre de la rama. Sirve para probar un build sin cortar nada estable.
- **Release estable:** release-please mantiene abierto un PR contra `main` con la versión propuesta y el changelog. Aceptarlo corta el tag `vX.Y.Z`, publica la imagen (`X.Y.Z`, `X.Y` y `latest`) y crea la release de GitHub.
- **Dónde ver el changelog:** `CHANGELOG.md` en la raíz, o `gh release view` para la última release publicada.
- **Si una release queda sin imagen:** falta o venció el secreto `RELEASE_PLEASE_TOKEN`. El tag ya existe; volver a correr `ci.yml` sobre ese tag publica la imagen sin crear una versión nueva.
- **Si el ratchet de calidad bloquea un cambio legítimo:** la salida por defecto es cubrir lo que falta, no esquivar el chequeo. La única excepción es la etiqueta `ci-ratchet-override` en el pull request, y **sólo la pone una persona** — un agente no se la aplica a sí mismo.
