## Context

Motivación en proposal.md ("Why"). Estado actual que condiciona el diseño:

- El contenido de las casas es un objeto tipado en `src/content/houses.ts` (`Record<HouseSlug, HouseContent>`), con tests que exigen que cada campo esté completo y que ciertos textos digan lo que deben (ropa de cama incluida, gas de garrafa no incluido). La presentación de inicio es un párrafo literal en `src/pages/index.astro`.
- La capacidad se renderiza en `src/pages/[slug].astro` a partir de campos estructurados (`maxGuests`, `bedrooms`, `bathrooms`, `floors`, `beds`) como tres ítems de lista. Nada más consume esos campos.
- El único almacenamiento por petición es el manifest JSON por casa bajo `DATA_DIR/houses/`, con escritura atómica (temporal + rename) y mutex por archivo en `src/server/houses/manifest-store.ts`. La foto de inicio reusa ese mismo mecanismo bajo el slug reservado `inicio` (`src/server/home-hero`).
- El sitio renderiza en el servidor en cada petición (adapter node), así que lo que se guarda en `DATA_DIR` se publica en la siguiente carga sin redeploy.
- Toda ruta bajo `/api/admin/**` pasa por el guardia de sesión de `src/middleware.ts`; los endpoints reciben `FormData` y responden JSON con `jsonResponse`. El panel por casa (`src/pages/admin/[house].astro`) hace `fetch` a `/api/admin/<casa>/<acción>` y recarga la página al terminar; el panel principal hace lo mismo para la foto de inicio.
- La suite e2e usa `./data-e2e` (ver `e2e/env.ts`) y arranca vacía; el teardown la borra.

## Goals / Non-Goals

**Goals:**

- Un solo mecanismo de "texto vigente = editado si existe, si no el original del código" que usen el sitio y el panel, para que nunca diverjan.
- Persistencia con las mismas garantías que los manifests: atómica, serializada por archivo, dentro de `DATA_DIR` (y por lo tanto dentro de la copia de seguridad ya documentada).
- Rendering seguro de texto plano: el escape lo hace Astro por defecto; el módulo sólo parte el texto en párrafos o ítems, nunca genera HTML.
- Que el contenido tipado siga siendo la fuente de los valores iniciales, sin duplicar los textos en otro lado.

**Non-Goals:**

- Formato enriquecido (negritas, enlaces, Markdown). Es texto plano por decisión del anfitrión.
- Editar títulos de sección, nombre de las casas, su frase corta, ni los textos de ubicación y contacto.
- Historial de versiones o vista previa antes de publicar: guardar publica.
- Migrar el contenido del código a `DATA_DIR`: el código sigue siendo el original.

## Decisions

### 1. Un archivo JSON por ámbito en `DATA_DIR/texts/<ámbito>.json`, sólo con las secciones editadas

Los ámbitos son `inicio`, `casa-rosa` y `casa-verde`; el archivo guarda `{ version: 1, sections: { [nombre]: texto } }` y sólo contiene las secciones que el anfitrión guardó alguna vez. "Volver al original" borra la clave. Así, "sin archivo" y "sin clave" significan lo mismo —usar el original— y no hay migración ni estado inicial que sembrar.

- _Alternativa: guardar los textos dentro del manifest de imágenes de la casa._ Descartada: mezcla dos ciclos de vida (una subida fallida no debería poder tocar los textos, y viceversa) y el manifest de `inicio` es una convención del módulo de la foto principal, no un lugar para más cosas.
- _Alternativa: un solo archivo para todos los ámbitos._ Descartada: un mutex por archivo serializaría las escrituras de las dos casas entre sí sin necesidad, y un archivo corrupto se llevaría todo.

### 2. La escritura atómica con mutex sale de `manifest-store` a un helper compartido

`atomicWrite` y `withWriteLock` de `src/server/houses/manifest-store.ts` pasan a `src/server/storage/json-file.ts` (lectura que devuelve un valor por defecto ante `ENOENT`, escritura atómica y serializada por ruta), y tanto los manifests como los textos lo usan. El comportamiento de los manifests no cambia; sus tests actuales lo verifican.

- _Alternativa: copiar las funciones al módulo nuevo._ Descartada: son exactamente las garantías que se quieren compartir, y dos copias divergen.

### 3. El módulo de textos define las secciones como datos, con su tipo de rendering y su original

`src/server/texts/sections.ts` declara, por ámbito, cada sección con su nombre estable (`description`, `capacity`, `highlights`, `services`, `rules`; `intro` para el inicio), su tipo (`paragraphs` | `list`) y una función que devuelve el texto original a partir de `src/content/houses.ts` (o del texto de inicio, que se muda del `.astro` al contenido). Para las listas, el original es el arreglo unido por saltos de línea; para la capacidad, las tres líneas que hoy se ven ("Hasta N personas", "N dormitorio(s), N baño(s), N plantas", camas), generadas desde los campos estructurados. `getEffectiveTexts(dataDir, ámbito)` devuelve para cada sección `{ text, customized }`.

Con esto, el sitio y el panel no conocen la estructura de `HouseContent`: piden el texto vigente de cada sección. Los campos estructurados de capacidad se conservan en el tipo (los tests de contenido los exigen y son la fuente del original), pero ya nadie los renderiza directamente.

- _Alternativa: hacer que `HouseContent` acepte texto libre en `capacity`._ Descartada: rompe los tests de contenido y pierde la información estructurada sin ganar nada, porque el original igual se deriva.

### 4. Rendering: el módulo parte, Astro escapa

`splitParagraphs(text)` separa por una o más líneas en blanco y descarta bloques vacíos; `splitLines(text)` separa por salto de línea y descarta líneas vacías (con `trim`). Las páginas hacen `paragraphs.map(p => <p>{p}</p>)` y `items.map(i => <li>{i}</li>)`: el texto entra como contenido, así que Astro escapa cualquier `<` que haya escrito el anfitrión (escenario "Texto con marcas"). El módulo nunca produce HTML ni usa `set:html`.

Un texto guardado que al partirlo quede sin ningún párrafo o ítem (sólo espacios) se rechaza en el guardado como vacío: se ofrece "volver al original" para ese caso, y así el sitio nunca muestra una sección en blanco.

### 5. Un endpoint de guardado y uno de vuelta al original por ámbito

`POST /api/admin/[scope]/texts/save` con `section` y `text` en `FormData`, y `POST /api/admin/[scope]/texts/reset` con `section`. `scope` se valida contra `HOUSE_SLUGS` más `inicio` (reusando `HOME_HERO_SLUG`); `section` contra las secciones declaradas para ese ámbito; `text` contra el límite de longitud (constante del módulo, 5000 caracteres, sobrada para cualquier sección real) y contra "vacío tras partir". Cualquier fallo de validación responde 400 con un mensaje en español que el panel muestra tal cual. El guardia del middleware cubre las rutas nuevas sin cambios.

- _Alternativa: reusar `/api/admin/[house]/alt` como modelo y crear un endpoint por sección._ Descartada: cinco rutas idénticas; el nombre de sección es un parámetro natural.
- _Alternativa: JSON en el cuerpo._ Descartada: el resto del panel usa `FormData` y la protección CSRF de Astro ya está calibrada para eso.

### 6. Panel: un `<textarea>` por sección, guardado por sección, sin recarga automática al fallar

En `/admin/<casa>`, una sección "Textos" debajo de la galería con, por cada sección editable: el título fijo, un `<textarea>` precargado con el texto vigente, un botón "Guardar", un botón "Volver al texto original" (sólo si `customized`) con `confirm()`, y un párrafo de estado (`role="status"` para éxito, `role="alert"` para error). Guardar con éxito recarga la página, como el resto de las acciones del panel; un error muestra el mensaje y deja el texto en el campo (escenario "Fallo al guardar"). En `/admin`, la misma pieza para la presentación de inicio, entre "Casas" y "Foto principal de inicio". Un componente `TextSectionEditor.astro` evita duplicar el marcado entre los dos paneles.

El `<textarea>` crece con el contenido (`field-sizing: content` donde exista, con un `min-height` en `rem` como piso) para que con Dynamic Type al máximo no quede un recuadro de dos líneas para un texto de diez.

### 7. Los textos del inicio se mudan al módulo de contenido

El párrafo de presentación deja `index.astro` y pasa a `src/content/home.ts` como `homeContent.intro`, para que el módulo de textos tenga de dónde leer el original sin importar un `.astro`. La frase corta del hero se queda en la página: no es editable.

## Risks / Trade-offs

- [El anfitrión borra por error una sección y guarda] → El guardado rechaza el texto vacío; borrar todo no publica una sección en blanco, y "volver al original" siempre está a un toque.
- [Un texto original cambia en el código en una versión futura pero el anfitrión ya lo había editado] → El editado gana, por diseño: es exactamente lo que el anfitrión quiere. El panel marca la sección como "editada" para que se vea que difiere del original.
- [Dos guardados concurrentes de secciones distintas del mismo ámbito] → El mutex por archivo los serializa; cada guardado relee el archivo antes de escribir, así el segundo no pisa al primero.
- [Archivo de textos corrupto en disco] → La lectura valida con zod (igual que el manifest); ante un archivo inválido se lanza, y el error se ve en el log y en un 500 del sitio, en vez de publicar silenciosamente los originales y ocultar la pérdida.
- [Texto muy largo pegado desde otra app] → Límite de 5000 caracteres por sección, con mensaje que lo indica; suficiente para el contenido real (la descripción más larga hoy ronda los 900).
- [Renderizar capacidad como texto libre pierde la semántica estructurada] → Aceptado: no hay ningún consumidor de los números fuera de esa sección, y el original se sigue derivando de ellos.

## Migration Plan

Sin migración de datos: sin archivos en `DATA_DIR/texts/`, el sitio se ve exactamente igual que hoy. Despliegue normal (`docker compose up -d --build`). Rollback: volver a la imagen anterior; los archivos de textos quedan en el volumen y se ignoran hasta que una versión que los lea vuelva a estar en línea. La copia de seguridad documentada en el README (todo `/data`) ya los incluye; el README lo menciona explícitamente.
