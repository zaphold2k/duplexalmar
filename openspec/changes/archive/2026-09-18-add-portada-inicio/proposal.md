## Why

La imagen principal de la página de inicio (el hero a pantalla completa) es hoy el archivo estático `public/images/reserve-cover.jpg`, hardcodeado en `src/pages/index.astro`. Cambiarla requiere reemplazar el archivo a mano y volver a compilar/desplegar — el anfitrión no tiene forma de actualizarla desde el celular, a diferencia de las fotos de cada casa, que ya administra por completo desde `/admin` (add-sitio-duplexalmar, hito 7).

## What Changes

- Nueva sección en el panel de administración para subir y reemplazar la foto principal de inicio, reutilizando el mismo pipeline de procesamiento de imágenes ya existente (conversión de formato, orientación EXIF, limpieza de metadatos, generación de variantes, límites de tamaño y formato).
- La página de inicio (`src/pages/index.astro`) usa esa foto administrada en lugar del archivo estático como imagen principal del hero, cuando existe una cargada.
- `reserve-cover.jpg` se conserva como imagen de reserva estática: se sigue usando en el hero de inicio mientras el anfitrión no cargó ninguna foto propia, y sigue siendo el respaldo de portada de una casa sin fotos (comportamiento actual de `admin-imagenes` / `galeria-casas`, sin cambios).
- Nuevos endpoints de escritura protegidos por el guardia de sesión ya existente (`src/middleware.ts` + `guard.ts`), sin cambios en la autenticación.

## Capabilities

### New Capabilities
- `portada-inicio`: administración, desde el panel, de la foto principal del hero de la página de inicio (subida, reemplazo y eliminación de una única imagen), y su publicación en el sitio.

### Modified Capabilities

_(ninguna: el requisito existente de `sitio-publico` sobre el hero de inicio — "ve una imagen de portada a pantalla completa" — no especifica su origen y se sigue cumpliendo; se agrega de dónde sale esa imagen como una capability nueva, no se cambia lo ya especificado)_

## Impact

- **Código**: nueva ruta de panel (p. ej. `src/pages/admin/inicio.astro` o una sección en `src/pages/admin/index.astro`), nuevos endpoints en `src/pages/api/admin/inicio/*`, cambios en `src/pages/index.astro` para leer la foto administrada, y en `src/layouts/BaseLayout.astro` si el `og:image` por defecto pasa a usar esta foto.
- **Almacenamiento**: reutiliza `src/server/images` (procesamiento, `storage.ts`) y `src/server/houses` (manifest atómico) sobre el mismo volumen `DATA_DIR`; a definir en design.md si se modela como un manifest dedicado o como una "casa" sintética de un solo ítem.
- **Sin cambios**: autenticación, subida por casa, `reserve-cover.jpg` como archivo de respaldo en el repositorio.
