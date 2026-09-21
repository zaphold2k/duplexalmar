## Context

Motivación en proposal.md ("Why"). Estado actual que condiciona el diseño:

- **Repo `duplexalmar`**: público en GitHub (`zaphold2k/duplexalmar`), rama principal `main`, rama de trabajo actual `feature/sitio-inicial`, sin `.github/`. `package.json` está en `0.0.1` y no hay ningún tag. El `Dockerfile` es multi-etapa sobre `node:22-bookworm-slim`, corre como usuario `node` (uid 1000) y expone `4321`; `.dockerignore` ya excluye `.github`, `openspec`, tests y secretos. `npm run check` cubre typecheck, lint, formato y tests unitarios; `npm run test:e2e:docker` construye la imagen con `docker-compose.e2e.yml`, corre Playwright desde el host (sólo Chromium, un worker) contra ella y la baja. Los commits siguen prefijos convencionales en español (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). `vitest` corre sin cobertura y sin reporte JUnit. No hay `CLAUDE.md` ni `AGENTS.md` en la raíz.
- **El componente `zaphold2k/ci-workflows`** ya existe, está publicado con los tags `v1` / `v1.0.1` y trae: `ci.yml` reutilizable (un input `language`, etapas sobreescribibles por comando, ratchet de calidad, imagen multi-arch con verificación y smoke test opcional, versionado y tags de imagen), `release.yml` reutilizable (release-please), plantillas por lenguaje en `templates/node/` y scripts propios (`version.mjs`, `collect-metrics.mjs`, `ratchet.mjs`, `smoke.mjs`, `promote.mjs`, `render-docs.mjs`). Sus reglas están documentadas en `docs/INPUTS.md`, `docs/BRANCHING.md`, `docs/VERSIONING.md` y `docs/QUALITY-GATES.md`.
- **La app ya sirve `/images/`** (`src/pages/images/[house]/[file].ts` → `serveImageFile`) con la misma caché inmutable de un año que el nginx de `proxy/nginx.conf`. El proxy local existe para no pasar estáticos por Node, no por una necesidad funcional.
- **Astro respeta `X-Forwarded-Proto` y `X-Forwarded-Host`** al reconstruir la URL de la petición (`astro/dist/core/app/node.js`), que es lo que compara `security.checkOrigin` con el `Origin` de cada POST. El proxy de producción envía ambos encabezados con el esquema `https` y la dirección pública.
- **El entorno de producción** ya está administrado por un repositorio de despliegue con Ansible, con sus propias convenciones para definir un servicio, sus inventarios y su runbook. Ese repositorio es la fuente de verdad del despliegue y de todo lo específico del entorno; este diseño no lo describe ni lo replica.
- **El host de producción corre sobre `arm64`** de 64 bits, lo que obliga a publicar la imagen para esa plataforma además de `amd64`.
- **El proxy de producción limita cada petición a 100 MB.** La subida del panel manda el lote completo en una sola petición multipart (`src/pages/admin/[house].astro`).

## Goals / Non-Goals

**Goals:**

- Reutilizar el flujo que ya existe en `ci-workflows` en vez de escribir una segunda implementación de lo mismo en este repositorio.
- Que cortar una versión no requiera tocar ningún archivo de flujo ni recordar ningún comando: los pre-releases salen de empujar la rama y la release de aceptar un PR.
- Que un cambio no pueda empeorar la cobertura, la cantidad de tests ni las supresiones de lint sin que alguien lo decida explícitamente y quede registrado.
- Que este repositorio deje escrito **qué necesita la imagen para correr**, de forma que el entorno pueda cumplirlo sin leer el código.
- Que el **cómo** del despliegue viva en el repo de despliegue, junto al resto de los servicios que ya administra.

**Non-Goals:**

- Mantener en este repositorio la lógica del pipeline: si hace falta cambiar cómo se construye, se versiona o se publica, el cambio va a `ci-workflows`. Acá sólo viven los inputs.
- Documentar en este repositorio la infraestructura: inventarios, hosts, direcciones, rutas del host, otros servicios del entorno o el rol de Ansible que se use. Todo eso vive en el repo de despliegue.
- Despliegue automático desde GitHub al entorno: el entorno está en una red privada y no se le va a abrir acceso desde Internet. Aplicar una release sigue siendo una decisión de una persona desde la máquina de control.
- Entornos de staging: las alphas se prueban con la suite e2e del CI y, si hace falta, desplegando la alpha al mismo entorno y volviendo atrás.
- Cambiar la subida del panel a una petición por foto (ver riesgo del límite del proxy).
- Migrar el `docker-compose.yml` local a la imagen publicada: sigue usando `build: .` para desarrollo.
- El modelo de rama `full` con `develop` y promoción de candidatos `rc`: es una capacidad del componente que este repositorio no usa.

## Decisions

### 1. Registro: GHCR público, sin credenciales en el entorno

La imagen se publica en `ghcr.io/zaphold2k/duplexalmar` con el `GITHUB_TOKEN` del propio workflow (`packages: write`); es además el nombre que el componente deriva por defecto de `<registry>/<owner>/<repo>`, así que se declara explícito sólo para que se lea en el workflow sin tener que conocer la derivación. Como el repo es público, el paquete se pone público una única vez a mano tras el primer push (los paquetes de usuario nacen privados aunque el repo no lo sea), y desde entonces el entorno hace `docker pull` sin `docker login`.

- _Alternativa: Docker Hub._ Descartada: exige una cuenta y un token adicional como secreto del repo; GHCR no pide nada y es el default del componente.
- _Alternativa: paquete privado más `docker login` en el entorno con un PAT de sólo lectura._ Descartada: el código ya es público y no hay nada en la imagen que no esté en el repo; un PAT en el entorno es un secreto más que rotar.

### 2. La versión es el tag, calculada por release-please desde los commits

El componente define que la fuente de verdad de la versión es el tag de git, no un archivo del lenguaje: `package.json.version` y `CHANGELOG.md` los mantiene release-please y son un registro, no la fuente. La versión se calcula de los commits convencionales acumulados desde el último tag estable: sólo `fix:` → patch, algún `feat:` → minor, una ruptura con la serie en `0.x` → minor (no major, porque un major en un proyecto que todavía no llegó a 1.0 prometería una estabilidad que no asumió).

Reparto de responsabilidades:

- **Pre-release**: no hay nada que hacer. Cada push a una rama `feature/*` crea el tag `vX.Y.Z-alpha.<rama>.N` sobre ese commit y publica su imagen en la misma corrida. `X.Y.Z` es la versión que _se va a_ liberar, calculada igual que lo haría release-please, así que una alpha anuncia la versión hacia la que va.
- **Release**: release-please mantiene abierto un PR contra `main` con la versión propuesta, el `CHANGELOG.md` y el `package.json` actualizados. Aceptarlo crea el tag `vX.Y.Z` y la release de GitHub con el changelog como cuerpo, y el tag dispara la publicación de la imagen estable.

Esto invierte la decisión original de este change (la versión en `package.json`, subida a mano con `npm version`, tag verificado contra ella). El motivo del cambio es que la versión deja de ser una decisión de este repositorio: el componente ya la resuelve, y sostener acá un modelo distinto significaría no poder usar su `release.yml`, que es justo la mitad del trabajo que se quería reutilizar. El costo es real y se acepta: la versión pasa a depender de la disciplina de los prefijos convencionales (que este repo ya sigue) y cada release requiere aceptar un PR más.

- _Alternativa: reutilizar sólo `ci.yml` del componente y mantener acá el corte de versión con `npm version`._ Descartada: obliga a escribir y mantener el workflow de release, el changelog y la verificación tag ↔ `package.json` que el componente ya trae, y deja este repositorio fuera de sincronía con el resto.
- _Alternativa: consumir el componente por SHA fijo en vez de `@v1`._ Descartada: `v1` es un tag flotante mantenido por el propio componente, que es la forma en que está pensado para consumirse; fijar un SHA convierte cada mejora del pipeline en un PR acá.

### 3. Dos workflows finos que sólo pasan inputs

```
.github/workflows/ci.yml       on: push (main, feature/*), pull_request
                               → uses: zaphold2k/ci-workflows/.github/workflows/ci.yml@v1
                                 language: node, branch_model: simple,
                                 work_branch_pattern: 'feature/*',
                                 image_name: ghcr.io/zaphold2k/duplexalmar,
                                 test_command + e2e_command + smoke_test_*
.github/workflows/release.yml  on: push main
                               → uses: zaphold2k/ci-workflows/.github/workflows/release.yml@v1
                                 target_branch: main, secrets.release_token
```

Copiados de `templates/node/simple/ci.yml` y `templates/node/release.yml`, con estos apartamientos del template:

| Input | Valor | Por qué |
| --- | --- | --- |
| `work_branch_pattern` | `feature/*` | Las ramas de este repo se llaman `feature/algo`, no `feature-algo`; el default `feature-*` no las reconocería y no publicarían nada. El componente normaliza el separador para el identificador de versión y de imagen, así que `feature/sitio-inicial` produce `-alpha.sitio-inicial.N`. |
| `test_command` | `npm test -- --coverage --reporter=junit --outputFile=.ci/junit.xml` | El default (`npm test --if-present`) no emite ni cobertura ni JUnit, y el ratchet no tendría qué leer (ver decisión 5). |
| `e2e_command` | `npx playwright install --with-deps chromium && npm run test:e2e:docker` | No hay default para e2e. Playwright corre desde el host del runner, así que el navegador hay que instalarlo; `--with-deps` trae también las librerías del sistema. |
| `smoke_test_endpoint` / `_port` / `_env` | `http://localhost:4321/`, `4321`, variables de prueba | Verifica que la imagen construida realmente arranca y responde antes de publicarse (ver decisión 6). |
| `readme_path` / `agent_docs` | `README.md`, `CLAUDE.md` | `AGENTS.md` no existe en este repo y no se va a crear; `CLAUDE.md` sí es el lugar donde este repositorio deja las instrucciones de agente. |

Todo el resto queda en los defaults del componente: `platforms` con las dos arquitecturas, `publish_image: true`, `registry: ghcr.io`, `dockerfile: Dockerfile`, `coverage_tolerance: 0`, `coverage_floor` vacío, `main_branch: main`.

- _Alternativa: omitir `image_name` y dejar que se derive._ Descartada por legibilidad: el nombre de la imagen es lo primero que alguien busca en el workflow.

### 4. Imagen multi-arch con QEMU, como la construye el componente

El componente construye primero `linux/amd64` cargado localmente para verificar (y para el smoke test), y sólo si la verificación completa pasó construye y publica la lista multi-arch con `platforms: linux/amd64,linux/arm64` usando `docker/setup-qemu-action` en un solo runner. Este repositorio no cambia eso.

Esto reemplaza la decisión original de usar runners ARM nativos en una matriz con push por digest y `imagetools create`: esa lógica viviría en este repositorio y sería exactamente la clase de duplicación que el change busca evitar. Si la duración de la construcción `arm64` emulada resulta un problema (ver riesgos), el arreglo es un input (`platforms`) mientras se resuelve en el componente, que es donde la mejora sirve para todos los repos.

La preparación del despliegue confirma que la arquitectura del host es efectivamente `aarch64`; si fuera de 32 bits, `sharp` no tiene binarios precompilados para esa plataforma y habría que volver sobre esta decisión.

Las etiquetas OCI (`org.opencontainers.image.source`, `.version`, `.revision`) las inyecta el componente en cada build, así que el `Dockerfile` de este repositorio no cambia. Vale la regla que el componente documenta: la versión efectiva de una imagen es la etiqueta por la que se la referencia, no lo que diga su manifiesto.

- _Alternativa: sólo `arm64`._ Descartada: la misma etiqueta tiene que servir para correr la imagen publicada en una máquina de desarrollo `amd64` (por ejemplo, para reproducir un bug de producción con `docker run`).

### 5. Ratchet de calidad: cobertura y JUnit desde vitest, tolerancia cero

El ratchet compara contra la última corrida verde de la rama de integración: cobertura (líneas, sentencias, funciones, ramas), tests que pasan, tests salteados y supresiones de lint o de tipos. Sin línea de base —la primera corrida— informa y no bloquea.

Para que tenga qué leer, `vitest.config.ts` gana:

- `coverage.provider: 'v8'` con los reporters `json-summary` (es el `coverage/coverage-summary.json` que el componente busca) y `text` para leerlo en el registro.
- El reporter `junit` con salida `.ci/junit.xml`, que es el primer candidato de la lista del componente.

Eso agrega `@vitest/coverage-v8` a las dependencias de desarrollo. Es la única dependencia nueva de todo el change y es de desarrollo: el runtime no cambia.

Tolerancia `0` y sin `coverage_floor`: la tolerancia estricta es el default del componente y no hay razón para aflojarla acá (la suite es determinista, corre en un worker y no depende del orden). Un piso absoluto se puede agregar más adelante, cuando haya varias corridas que digan cuál es el número real; inventarlo hoy a partir de la cobertura de este commit no aportaría información.

El escape, cuando una regresión aparente es una mejora deliberada, es la etiqueta `ci-ratchet-override` en el PR: una acción visible y atribuida, no un valor de configuración. Queda escrito en el README que un agente no se la pone a sí mismo.

- _Alternativa: dejar el ratchet informativo, sin tocar vitest._ Descartada: sin cobertura ni JUnit el ratchet no mide nada y la mitad del valor del componente queda apagada; agregar un reporter es más barato que sostener esa deuda.

### 6. Smoke test del contenedor con variables de prueba

El componente puede arrancar la imagen recién construida y esperar una respuesta en un endpoint. Se usa: `http://localhost:4321/` en el puerto `4321`, con `smoke_test_env` llevando valores de prueba para las variables que el arranque exige (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `WHATSAPP_NUMBER`, `DATA_DIR`). No es una verificación funcional —para eso está la suite e2e— sino la garantía de que la imagen que se va a publicar arranca y sirve el sitio.

Los valores de prueba son valores inventados en el propio workflow, no secretos: el contenedor se levanta, responde y se baja, sin volumen persistente y sin exponerse a nada.

- _Alternativa: no configurar smoke test y confiar en la e2e._ Descartada: la e2e corre contra la imagen que construye `docker-compose.e2e.yml`, no contra la que se publica; el smoke test es el único paso que toca el artefacto publicado.

### 7. Changelog: release-please con las secciones en español del template

`release-please-config.json` se copia de `templates/node/release-please-config.json`, que ya define las secciones en español (`feat` → Funcionalidades, `fix` → Correcciones, `perf` → Rendimiento, `revert` → Reversiones, `docs` → Documentación visible; `refactor`, `chore`, `test`, `build` y `ci` ocultos) y `bump-minor-pre-major`. `.release-please-manifest.json` arranca en `0.0.1`, la versión que hoy declara `package.json`, para que la primera release calculada sea `0.1.0`.

A diferencia del diseño original, `CHANGELOG.md` **se commitea**: lo escribe release-please en su propio PR, así que no hace falta que ningún workflow empuje a `main` por fuera de ese PR. Esto elimina `cliff.toml` y git-cliff del change.

- _Alternativa: mantener git-cliff sólo para el cuerpo de la release._ Descartada: sería un segundo generador de changelog conviviendo con el de release-please.

### 8. Documentación de flujo generada, y verificada en cada corrida

`render-docs.mjs` del componente instala un bloque delimitado por marcadores en `README.md` y en `CLAUDE.md` con el flujo concreto de este repositorio: de qué rama trabajar, qué produce cada push, cómo se corta una versión y que el ratchet no es algo para esquivar. El `ci.yml` del componente lo regenera en cada corrida y falla si difiere, así que cambiar el modelo de rama o el nombre de la imagen sin regenerarlo rompe la verificación en vez de envejecer en silencio.

El bloque se genera en inglés (el componente es multi-repo y no traduce). Alrededor de ese bloque, este repositorio escribe sus propias secciones en español: "Versiones" (cómo sale una alpha, cómo se corta una release, dónde ver el changelog) y "Ejecutar la imagen en producción" (el contrato de la decisión 9). El bloque generado no se edita a mano.

- _Alternativa: desactivar la verificación (`readme_path: ''`, `agent_docs: ''`) y escribir todo a mano en español._ Descartada: la parte que se desactualiza es justamente la que describe el flujo, y es la que el componente puede mantener sola.

### 9. Este repo publica un contrato de ejecución; el despliegue se diseña en el repo de despliegue

La frontera entre los dos repositorios es deliberada. Acá se documenta, en el README, **qué exige la imagen** para correr en producción:

| Exigencia | Valor |
| --- | --- |
| Datos | Volumen persistente en `DATA_DIR`, escribible por uid 1000 (usuario `node` de la imagen) |
| Configuración | Variables de entorno de `.env.docker.example`; el proceso falla al arrancar nombrando la que falte |
| Puerto | `4321` en la red interna; el contenedor no necesita publicar ningún puerto en el host |
| Salud | El healthcheck de `docker-compose.yml` (petición a la raíz del sitio) |
| Memoria | Límite explícito, 512 MB, igual que en el compose local |
| Delante | Un proxy que termine TLS y reenvíe `X-Forwarded-Proto` y `X-Forwarded-Host` |
| Tamaño de petición | El lote de subida entra en una sola petición; configurar `MAX_UPLOAD_BATCH_SIZE` por debajo del límite del proxy |
| Versión | La versión que corre es la etiqueta de la imagen; si la app tiene que reportarla, se le pasa por variable de entorno desde el despliegue |

Todo lo demás —cómo se define el servicio, en qué inventario, con qué rutas, sobre qué host, con qué red y con qué comando se aplica— se escribe en el repo de despliegue, junto al runbook de las demás apps que ya administra. Este repositorio no lo replica, por dos razones: es información sobre la infraestructura que no tiene por qué vivir en un repo público, y duplicarla garantiza que las dos copias diverjan.

- _Alternativa: un `docker-compose.prod.yml` en este repo._ Descartada: sería la tercera copia de la misma definición (la del repo de despliegue es la que efectivamente corre) y arrastraría acá las rutas del host.
- _Alternativa: documentar todo el procedimiento en este README._ Descartada por lo anterior.

### 10. Producción sin nginx: un solo contenedor detrás del proxy del entorno

En producción corre únicamente el contenedor de la app, sin el nginx del compose local. La app ya sirve `/images/` con los mismos encabezados de caché; el proxy del entorno termina TLS y además cachea los estáticos en el borde; y el único archivo auxiliar que habría que llevar al entorno a mano sería `nginx.conf`, que es justo el tipo de archivo que el repo de despliegue no gestiona automáticamente. Un contenedor menos es una cosa menos que puede estar mal en producción.

Con TLS terminado afuera, el `Origin` de cada POST del panel es `https://<dirección pública>` y el adapter de Astro reconstruye la URL de la petición con los `X-Forwarded-*` que el proxy adjunta, así que `checkOrigin` coincide. Esto se verifica de forma explícita en la primera subida real detrás del proxy, porque ni la suite e2e ni el smoke test pasan por uno.

- _Alternativa: mantener nginx como segundo contenedor._ Descartada por lo anterior; si en el futuro Node no diera abasto sirviendo imágenes, se agrega en la definición del servicio del repo de despliegue y se apunta el proxy a él, sin tocar la imagen.
- _Alternativa: publicar `nginx.conf` dentro de una segunda imagen `duplexalmar-proxy`._ Descartada: duplica el trabajo de CI para un archivo de 30 líneas.

### 11. Despliegue por versión fijada y por commit, con ensayo previo

Aplicar una versión es fijarla en la definición del servicio del repo de despliegue, ver el diff, correr el ensayo (`--check --diff`), aplicar y dejar el cambio commiteado allá. La vuelta atrás es el mismo procedimiento con la versión anterior: los datos viven en un volumen del entorno y no se tocan. El repo de despliegue provee un comando que encadena esos pasos para que el diff, la confirmación y el commit no se olviden; su forma concreta se decide allá.

La versión fijada es siempre una versión concreta: nunca `latest`, ni el nombre de una rama, ni una etiqueta de pre-release móvil.

- _Alternativa: `latest` fijado y un tag de "actualizar"._ Descartada: no deja rastro de qué versión corre, y volver atrás requeriría bajar una etiqueta concreta a mano.

### 12. Ansible en la máquina de control con pipx

`pipx install ansible-core` y `pipx install ansible-lint`, aislados del Python del sistema y sin `sudo pip`, más las dependencias que el repo de despliegue declare (collections y rol). La verificación de que la máquina de control quedó lista (conectividad y ensayo del playbook) es un paso del runbook de ese repo.

- _Alternativa: el devcontainer del repo de despliegue._ Descartada: agrega Docker-in-Docker para algo que corre bien en el host, y su script de dependencias no cubre todo lo necesario.

## Risks / Trade-offs

- **[La construcción `arm64` emulada con QEMU es mucho más lenta: `npm ci` con `sharp` y `astro build` bajo emulación son el caso típico de build que se cuelga]** → Se mide en la primera publicación real (tarea 7.1). Si no cierra, el paliativo inmediato acá es recortar `platforms` a `linux/amd64` y desplegar la `arm64` a mano una vez; el arreglo de fondo **no se escribe en este repositorio**: se propone como un change nuevo en `ci-workflows` para que su job de Docker construya cada plataforma en un runner nativo (`ubuntu-24.04` y `ubuntu-24.04-arm`), suba por digest y arme la lista con `imagetools create`, en vez de emular con QEMU. Así la mejora llega a todos los repos que consumen `@v1` y este repositorio sólo vuelve a poner las dos plataformas.
- **[La imagen `arm64` construye bien pero `sharp` no encuentra su binario en producción]** → `sharp` publica binarios `linux-arm64` glibc y el `Dockerfile` instala en la misma etapa base para cada plataforma; ni la e2e ni el smoke test lo verían (ambos corren en `amd64`), por eso la verificación de punta a punta incluye una subida real desde el panel.
- **[Prettier reformatea el bloque generado y pelea con la verificación de drift: `format:check` exige una forma y `render-docs --check` exige otra]** → Se verifica en la misma tarea que lo genera, corriendo `npm run format` después de generarlo y comprobando que el bloque no cambió. Si cambia, la salida es agregar los archivos que llevan el bloque a `.prettierignore` antes de que el CI los vea; si eso no alcanza, se ajusta el renderizador en `ci-workflows`.
- **[release-please reformatea `CHANGELOG.md` en cada release y Prettier lo vuelve a tocar]** → Mismo tratamiento: `CHANGELOG.md` va a `.prettierignore` si hace falta. Es un archivo generado; no tiene sentido pelear por su formato.
- **[Sin `RELEASE_PLEASE_TOKEN`, aceptar el PR de release crea el tag pero no publica la imagen]** → El secreto es parte de las tareas de este change. Si falta o se vence, el síntoma es una release sin imagen y el paliativo es re-correr `ci.yml` sobre el tag; queda escrito en el README.
- **[El ratchet bloquea un cambio legítimo, por ejemplo un refactor que consolida tests]** → La etiqueta `ci-ratchet-override` en el PR, que es visible y queda atribuida. El README deja claro que el arreglo por defecto es cubrir el código, no poner la etiqueta.
- **[La primera corrida no tiene línea de base y el ratchet sólo informa]** → Es el comportamiento buscado: la línea de base se establece con la primera corrida verde de `main`. Hasta entonces las métricas se leen en el resumen del job.
- **[Cada push a una rama `feature/*` publica una imagen y un tag]** → Es el modelo del componente y es lo que hace que una alpha se pueda desplegar sin ceremonia. A la escala de este proyecto son decenas de imágenes por año; si molestara, la retención se agrega en `ci-workflows`.
- **[El proxy corta cualquier petición mayor a 100 MB]** → La configuración de entorno del despliegue fija `MAX_UPLOAD_BATCH_SIZE=6` (6 × 15 MB = 90 MB, por debajo del límite); el panel ya informa el límite de lote al anfitrión. Pasar a una petición por foto es un change aparte, si el anfitrión lo necesita.
- **[Consumir `@v1` significa que un cambio en `ci-workflows` llega acá sin PR]** → Es el objetivo (una mejora del pipeline aterriza en todos los repos a la vez) y el riesgo (una regresión también). El componente tiene su propia suite y su `self-check`; el paliativo, si alguna vez hace falta, es fijar `@v1.0.1` temporalmente.
- **[La frontera entre repos deja el contrato de ejecución desactualizado]** → El contrato es una tabla corta en el README y cambia sólo si cambia la imagen; cualquier cambio en `Dockerfile`, `.env.docker.example` o el healthcheck obliga a revisarla en el mismo PR.
- **[La suite e2e en CI necesita Docker y Chromium en el runner]** → `ubuntu-latest` trae Docker con Compose v2; `npx playwright install --with-deps chromium` instala el navegador y sus librerías en el mismo comando del `e2e_command`.

## Migration Plan

1. Preparar la máquina de control y el entorno siguiendo el runbook del repo de despliegue (dependencias de Ansible, volumen de datos, variables de entorno, dirección pública).
2. Ensayar el pipeline completo en la rama de trabajo con `dry_run: true`, leer en el resumen qué tags e imágenes habría producido, y recién entonces quitar el input.
3. Empujar la rama de trabajo con el pipeline activo: sale la primera alpha (`0.1.0-alpha.sitio-inicial.N`) con su imagen. Hacer público el paquete en GHCR y comprobar el `docker pull` sin credenciales.
4. Mergear a `main`. release-please abre el PR de release con `0.1.0`; aceptarlo publica `0.1.0`, `0.1`, `latest`, el tag `v0.1.0`, el `CHANGELOG.md` y la release.
5. Desplegar `0.1.0`; verificar el sitio por la dirección pública y una subida desde el panel.
6. Vuelta atrás si algo falla: la app es nueva en el entorno, así que "atrás" es bajarla; el despliegue manual actual, si sigue corriendo en otra máquina, no se ve afectado. Las fotos cargadas hasta entonces se llevan al volumen nuevo con el procedimiento de respaldo del README.

## Open Questions

- Dirección pública definitiva del sitio: la fija el anfitrión; no cambia nada de este diseño, sólo un valor del runbook del repo de despliegue.
- Si el anfitrión llegara a subir lotes grandes con frecuencia, conviene abrir el change de "una petición por foto" antes de bajar aún más `MAX_UPLOAD_BATCH_SIZE`.
- Un `coverage_floor` concreto: se decide después de unas cuantas corridas, cuando la cobertura real de `main` esté medida.
