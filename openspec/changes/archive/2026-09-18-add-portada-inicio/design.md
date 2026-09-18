## Context

Ver `proposal.md — Why` para la motivación. Estado actual relevante (ver `add-sitio-duplexalmar`, ya implementado):

- `src/server/houses/manifest-schema.ts` define un manifest genérico (`version`, `cover`, `gallery`, `images`) validado con zod; `manifest-store.ts` lo lee/escribe de forma atómica en `/data/houses/<slug>.json`, tomando `houseSlug` como `string` sin restringirlo al tipo `HouseSlug`.
- `src/server/images` (`batch.ts`, `process-image.ts`, `storage.ts`) procesa y guarda imágenes bajo `/data/images/<slug>/`, también parametrizado por `slug: string`, no por `HouseSlug`.
- `HOUSE_SLUGS` (`['casa-rosa', 'casa-verde']`) y `isHouseSlug` en `src/content/houses.ts` son los que restringen qué slugs son "una casa" con contenido propio (nombre, descripción, capacidad, etc.); el manifest y el pipeline de imágenes no imponen esa restricción por sí solos.
- `guard.ts` protege por prefijo de ruta (`/admin/**`, `/api/admin/**`), no por lista de casas: cualquier ruta nueva bajo esos prefijos queda protegida sin tocar el guardia.

## Goals / Non-Goals

**Goals:**

- Reusar el pipeline de procesamiento e persistencia de imágenes ya existente tal cual está, sin bifurcarlo ni duplicar su lógica de EXIF/HEIC/variantes/limpieza de metadatos.
- Que el modelo de datos nuevo sea la mínima diferencia posible sobre el ya existente, dado que es genérico y ya resuelve exactamente lo que hace falta (una imagen "vigente" con derivados).

**Non-Goals:**

- No se agrega edición de texto alternativo para esta foto: es una imagen de fondo con un titular superpuesto (mismo patrón que el hero actual), no una foto de galería que dependa de su alt para transmitir información. El alt queda fijo en la plantilla, igual que hoy.
- No se agrega historial ni una galería de opciones para el hero de inicio: solo existe la vigente. Si el anfitrión quiere volver a una anterior, tendría que resubirla.

## Decisions

### 1. Modelar la foto principal como una "casa" sintética de un solo ítem, reusando el manifest existente sin tocar su esquema

La foto principal de inicio se persiste como un manifest más en `/data/houses/inicio.json`, con el mismo `houseManifestSchema`, y sus archivos en `/data/images/inicio/`, con el mismo `saveProcessedImage`/`deleteImageFiles`/`processUploadBatch` que ya usa una casa real. La regla de "una sola imagen vigente" (reemplazar la anterior en vez de agregarla a una galería) se impone en una capa nueva y delgada, no en el esquema: antes de guardar la imagen nueva, se borra la anterior (si existía) y se escribe el manifest con `gallery` de un solo elemento.

`'inicio'` se define como constante reservada en un módulo nuevo (p. ej. `src/server/home-hero/index.ts`), separado de `content/houses.ts`: no es una casa con contenido propio (no tiene nombre, tagline, capacidad, servicios), así que no debe aparecer en `HOUSE_SLUGS` ni pasar `isHouseSlug`. Ese módulo expone funciones específicas (`getHomeHeroImage`, `replaceHomeHeroImage`, `deleteHomeHeroImage`) que internamente llaman a las funciones genéricas de `server/houses` y `server/images` con el slug `'inicio'`.

**Por qué:** el manifest ya modela exactamente lo que hace falta (una referencia a la imagen vigente más sus metadatos), y el pipeline de imágenes ya no tiene ninguna dependencia real de que el slug sea una casa de las dos existentes. Introducir un esquema o un almacenamiento paralelo solo para tener "un solo id en vez de un array" sería una segunda forma de resolver el mismo problema, sin necesidad real.

**Alternativas consideradas:**

- *Esquema y tabla de almacenamiento dedicados para la foto de inicio* (p. ej. `/data/home-hero.json` con `{ imageId, ... }` sin `gallery`). Más explícito sobre que "no es una casa", pero duplica la validación, el guardado atómico y las funciones de `manifest-store.ts` para un caso que es un subconjunto estricto del existente. Descartada por duplicación innecesaria.
- *Agregar `'inicio'` a `HOUSE_SLUGS` como una casa más.* Rompe el tipo `HouseContent` (nombre, tagline, capacidad, servicios no tienen sentido para el hero de inicio) y filtra este caso especial a todos los lugares que hoy asumen que `HOUSE_SLUGS` son casas reales (selección de casa en `/admin`, páginas públicas por slug). Descartada.

### 2. Sección propia dentro de `/admin` en vez de una ruta nueva tipo `/admin/inicio`

La subida, reemplazo y eliminación de la foto principal se agregan como una sección más en `src/pages/admin/index.astro` (donde hoy está la selección de casa), no como una página nueva con su propia URL.

**Por qué:** `[house].astro` es una página completa porque administra una galería (miniaturas, orden, portada, alt, subida por lote). Acá hay una sola imagen con tres acciones (subir, reemplazar, eliminar): calca menos superficie si se resuelve en el panel de entrada, que ya es donde el anfitrión aterriza primero.

**Alternativas consideradas:**

- *Página dedicada `/admin/inicio.astro`*, simétrica a `/admin/[house].astro`. Da lugar a crecer si en el futuro el hero necesitara más de una imagen o más controles, pero hoy sería una página casi vacía. Descartada por ahora; si se necesita más adelante, migrar la sección a una página propia es un cambio acotado.

### 3. Endpoints nuevos bajo `/api/admin/inicio/`, sin tocar el guardia

`POST /api/admin/inicio/upload` (sube y reemplaza) y `POST /api/admin/inicio/delete` (quita la vigente). No hacen falta `cover`/`move`/`alt`: no hay portada que elegir entre varias, ni orden, ni texto alternativo editable.

`guard.ts` ya protege por prefijo (`pathname.startsWith('/api/admin')`), así que estos endpoints quedan protegidos sin ningún cambio en `guard.ts` ni en `middleware.ts`.

### 4. `index.astro` resuelve su propio `og:image`, igual que ya hace `[slug].astro`

`src/pages/index.astro` consulta el manifest de `'inicio'` (vía el nuevo `home-hero`) y, si hay una imagen vigente, construye su URL con `imageVariantUrl` y la pasa como `ogImagePath` a `BaseLayout`, igual que `[slug].astro` hace hoy con la portada de una casa. Si no hay ninguna vigente, no pasa `ogImagePath` y `BaseLayout` sigue usando su default estático (`/images/reserve-cover.jpg`), sin cambios en `BaseLayout.astro`.

## Risks / Trade-offs

- **Reusar `houses/*.json` para algo que no es una casa puede confundir a quien lea el directorio de datos o el código más adelante** → Mitigación: el módulo `home-hero` es la única puerta de entrada a este slug reservado (nada más en el código construye `'inicio'` a mano), con un comentario explícito en su definición explicando por qué reusa el manifest de casas. `isHouseSlug('inicio')` sigue devolviendo `false`, así que no puede colarse por las rutas públicas de casa ni por la selección de casa del panel.
- **Colisión de nombre si en el futuro se agrega una tercera casa real llamada "inicio"** → Riesgo muy bajo (dos casas fijas, con nombre propio ya definido); si ocurriera, alcanzaría con mover el hero a otro slug reservado antes de dar de alta esa casa.
- **Borrar la foto anterior antes de que la nueva termine de procesarse podría dejar el hero sin imagen si el procesamiento falla a mitad de camino** → Mitigación: seguir el mismo orden que ya usa la subida de una casa (procesar y guardar la imagen nueva primero; recién si eso tiene éxito, actualizar el manifest y borrar los archivos de la anterior). Si el procesamiento falla, la vigente no se toca.

## Migration Plan

No hay datos que migrar: `readManifest` ya devuelve `EMPTY_MANIFEST` cuando el archivo no existe, así que `/data/houses/inicio.json` se crea solo, en la primera subida. Se despliega junto con el resto del código (rebuild de la imagen Docker); no requiere pasos manuales ni tiempo de inactividad.
