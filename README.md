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
| `npm run hash-password -- "contraseña"` | Genera el hash para `ADMIN_PASSWORD_HASH`                                                                            |
| `npm run maintenance`                   | Lista archivos huérfanos en `/data/images/` y el espacio que ocupan, sin borrar nada                                 |
| `npm run maintenance -- --delete`       | Borra los huérfanos listados                                                                                         |

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
