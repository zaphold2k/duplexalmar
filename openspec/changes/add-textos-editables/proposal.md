## Why

Los textos del sitio (la presentación de inicio y, en cada casa, la descripción, la capacidad, lo que la distingue, los servicios y las condiciones de la estadía) viven en el código, en `src/content/houses.ts` y en `src/pages/index.astro`. Cualquier cambio de temporada —un servicio nuevo, una regla que cambia, una descripción que envejece— hoy requiere tocar código y hacer un despliegue. El anfitrión ya administra las fotos desde el panel sin ese costo; los textos son la única parte del contenido que todavía no puede mantener solo.

## What Changes

- Nuevo módulo de servidor para los textos editables: guarda, por ámbito (`inicio`, `casa-rosa`, `casa-verde`) y por sección, el texto que el anfitrión escribió; devuelve el texto vigente de cada sección, que es el editado si existe y, si no, el actual del código como valor inicial y de reserva.
- Endpoints de administración, detrás del mismo guardia de sesión que el resto de `/api/admin/**`, para guardar el texto de una sección y para volver al texto original.
- Panel: en la página de cada casa, una sección "Textos" con un campo por sección editable (descripción, capacidad, lo que la distingue, servicios, para tener en cuenta), precargado con el texto vigente, con guardar y "volver al texto original". En el panel principal, lo mismo para la presentación de inicio.
- Sitio público: la página de cada casa y el inicio muestran el texto vigente de cada sección. El formato es texto plano: la descripción y la presentación se muestran como párrafos (separados por línea en blanco); capacidad, lo que la distingue, servicios y para tener en cuenta se muestran como lista, un ítem por línea. Los títulos de las secciones no cambian.
- La capacidad deja de renderizarse a partir de los campos estructurados (`maxGuests`, `bedrooms`, etc.): su texto inicial se deriva de ellos con el mismo formato que hoy se ve, y a partir de ahí es texto libre.
- Los textos editados persisten bajo `DATA_DIR`, junto a los manifests, así entran en la misma copia de seguridad que las fotos.

## Capabilities

### New Capabilities

- `textos-editables`: administración desde el panel de los textos de contenido del sitio público (presentación de inicio y secciones de cada casa), su formato en texto plano, el valor inicial tomado del código, la vuelta al original y su publicación sin redeploy.

### Modified Capabilities

<!-- Ninguna: `sitio-publico` sigue exigiendo que la página de una casa muestre descripción, capacidad, servicios y condiciones, y el inicio una presentación breve; cambia de dónde sale el texto, no lo que se muestra. -->

## Impact

- **Código nuevo**: `src/server/texts/` (modelo de secciones, lectura/escritura atómica, texto vigente), `src/pages/api/admin/[scope]/texts/*.ts`, sección "Textos" en `src/pages/admin/[house].astro` y "Presentación de inicio" en `src/pages/admin/index.astro`.
- **Código modificado**: `src/pages/[slug].astro` e `src/pages/index.astro` pasan a leer el texto vigente de cada sección y a renderizarlo como párrafos o lista según la sección; `src/content/houses.ts` conserva el contenido tipado como fuente de los valores iniciales y gana los textos iniciales de capacidad derivados de sus campos. La escritura atómica con mutex por archivo de `src/server/houses/manifest-store.ts` se comparte con el módulo nuevo.
- **Datos**: archivos nuevos `DATA_DIR/texts/<ámbito>.json`. Sin migración: si no existen, todo se ve exactamente como hoy.
- **Sin dependencias nuevas.** Sin cambios en la autenticación (`guard.ts` no se toca) ni en el pipeline de imágenes.
- **Tests**: unitarios del módulo y de los endpoints; e2e del flujo panel → sitio público, incluidos los objetivos táctiles de los controles nuevos y la accesibilidad de los campos.
- **Docs**: README, sección del panel y de la copia de seguridad.
