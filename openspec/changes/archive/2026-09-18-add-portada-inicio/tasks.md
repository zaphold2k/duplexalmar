## 1. Módulo de la foto principal de inicio

- [x] 1.1 Crear el módulo `src/server/home-hero/` con la constante del slug reservado (`'inicio'`) y una función `getHomeHeroImage(dataDir)` que lee el manifest de ese slug con `readManifest` y devuelve la imagen vigente (o `null` si no hay ninguna), y verificar con un test que, sin manifest en disco, devuelve `null` sin lanzar
- [x] 1.2 Implementar `replaceHomeHeroImage(dataDir, file, limits)`: procesa el archivo con el mismo pipeline que una casa (`processUploadBatch`/`processImage` de `src/server/images`), y sólo si el procesamiento tiene éxito, guarda la imagen nueva, actualiza el manifest (`gallery`/`cover` con un único id) y recién entonces borra los archivos de la imagen anterior si existía, y verificar con tests que (a) la primera carga deja el manifest con un solo id, (b) un reemplazo dado un manifest ya poblado no deja archivos huérfanos de la imagen anterior, y (c) un archivo inválido no toca la imagen vigente ni el manifest
- [x] 1.3 Implementar `deleteHomeHeroImage(dataDir)`: borra los archivos de la imagen vigente (si hay alguna) y vacía el manifest, y verificar con un test que después de llamarla `getHomeHeroImage` devuelve `null` y no quedan archivos en `/data/images/inicio/`
- [x] 1.4 Verificar con un test que `isHouseSlug('inicio')` sigue devolviendo `false` y que `'inicio'` no aparece en `HOUSE_SLUGS`, dejando explícito que el slug reservado no se cuela como una casa

## 2. Endpoints de administración

- [x] 2.1 Implementar `POST /api/admin/inicio/upload` (un único archivo, reusa los límites de `config.uploads`) delegando en `replaceHomeHeroImage`, y verificar con un test de servidor que sube una imagen válida y confirma que la respuesta referencia la imagen nueva
- [x] 2.2 Implementar `POST /api/admin/inicio/delete` delegando en `deleteHomeHeroImage`, y verificar con un test que responde correctamente incluso si no había ninguna imagen vigente (operación idempotente)
- [x] 2.3 Verificar con un test que ambos endpoints responden con estado de no autorizado ante una petición sin sesión válida, sin modificar el estado en disco (mismo guardia que el resto de `/api/admin/**`, sin cambios en `guard.ts`)

## 3. Panel de administración

- [x] 3.1 Agregar a `src/pages/admin/index.astro` una sección "Foto principal de inicio" con la miniatura de la vigente (o un estado vacío si no hay ninguna), un campo de subida y un botón de eliminar con confirmación explícita, y verificar visualmente que se ve correctamente en modo claro y oscuro y con el tamaño de texto del sistema en su ajuste máximo — cubierto por e2e (`home-hero.spec.ts`, `touch-targets.spec.ts`) y verificado en un iPhone real en modo oscuro y con el texto al máximo
- [x] 3.2 Cablear la subida y la eliminación a los endpoints nuevos con manejo de progreso y de error igual de explícito que en `[house].astro` (la página se recarga sola al terminar, como el resto de las acciones del panel), y verificar con un test de navegador que subir una foto la refleja en la miniatura, y que eliminarla vuelve al estado vacío
- [x] 3.3 Verificar con un test de navegador que los controles nuevos cumplen el objetivo táctil mínimo de 44×44px CSS, igual que el resto del panel

## 4. Sitio público

- [x] 4.1 Modificar `src/pages/index.astro` para leer `getHomeHeroImage` y usar esa imagen (con `ResponsiveImage`, igual que hace `[slug].astro` con la portada de una casa) como hero a pantalla completa cuando exista, y verificar que renderiza igual que antes (imagen de reserva) cuando el manifest de `'inicio'` está vacío
- [x] 4.2 Resolver el `ogImagePath` de `index.astro` a partir de la imagen vigente con `imageVariantUrl`, dejando que `BaseLayout` use su default estático cuando no hay ninguna, y verificar con un test que compartir el enlace de inicio después de cargar una foto expone esa foto como vista previa
- [x] 4.3 Verificar con un test de navegador (o e2e, siguiendo el patrón de `e2e/admin-panel.spec.ts`) el flujo completo: sin foto cargada se ve la imagen de reserva, se sube una foto desde el panel, la página de inicio la muestra de inmediato sin redeploy, se elimina y la página vuelve a la imagen de reserva

## 5. Verificación final

- [x] 5.1 Correr `npm run check` y confirmar que queda en verde con todo lo agregado en esta change
- [x] 5.2 Actualizar el `README`/documentación operativa si describe las rutas de `/admin`, para que mencione la nueva sección de foto principal de inicio
