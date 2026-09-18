# portada-inicio Specification

## Purpose

Define cómo el anfitrión administra, desde el panel privado, la foto principal a pantalla completa de la página de inicio del sitio, sin depender de un redeploy para actualizarla.

## Requirements

### Requirement: Acceso restringido a la administración de la foto principal

La administración de la foto principal de inicio SHALL requerir autenticación, con el mismo mecanismo de sesión que el resto del panel. Toda operación de escritura sobre esta foto SHALL rechazar peticiones no autenticadas.

#### Scenario: Operación sin sesión

- **WHEN** llega una petición de subida, reemplazo o eliminación de la foto principal de inicio sin una sesión válida
- **THEN** el sistema la rechaza con un estado de no autorizado y no modifica la foto publicada

### Requirement: Subida y reemplazo de la foto principal de inicio

El anfitrión SHALL poder subir, desde el panel, una foto para usar como imagen principal a pantalla completa de la página de inicio. A diferencia de la galería de una casa, esta foto SHALL ser única: no hay orden ni múltiples imágenes, solo la vigente.

Si el anfitrión sube una foto nueva mientras ya existe una vigente, el sistema SHALL reemplazar la vigente por la nueva y SHALL eliminar los archivos de la que reemplazó, sin dejar archivos huérfanos.

El sistema SHALL aplicar a esta foto los mismos límites de formato y tamaño que a las fotos de una casa (ver capability `admin-imagenes`, "Subida de fotos desde el celular").

#### Scenario: Primera carga de la foto principal

- **WHEN** el anfitrión sube una foto para el inicio y todavía no había ninguna cargada
- **THEN** el sistema la procesa y la publica como imagen principal de la página de inicio

#### Scenario: Reemplazo de la foto principal existente

- **WHEN** el anfitrión sube una foto nueva habiendo ya una foto principal vigente
- **THEN** el sistema publica la foto nueva como principal y elimina los archivos derivados y el original de la anterior

#### Scenario: Archivo inválido o que excede el límite

- **WHEN** el anfitrión intenta subir un archivo que no es una imagen válida, o que supera el límite de tamaño configurado
- **THEN** el sistema lo rechaza con un mensaje claro y la foto principal vigente no cambia

### Requirement: Procesamiento de la foto principal

La foto principal de inicio SHALL procesarse antes de publicarse, con las mismas garantías que las fotos de una casa: conversión a un formato de compresión moderno, corrección de orientación según metadatos EXIF, eliminación de metadatos (incluida geolocalización), y generación de las variantes de tamaño que necesita el hero de inicio.

#### Scenario: Foto en HEIC tomada en vertical con geolocalización

- **WHEN** el anfitrión sube desde su iPhone, como foto principal de inicio, una imagen HEIC tomada en vertical y con metadatos de ubicación
- **THEN** el sitio la muestra derecha y correctamente en todos los navegadores actuales, sin exponer la ubicación ni ningún otro metadato de la cámara

### Requirement: Eliminación de la foto principal

El anfitrión SHALL poder quitar la foto principal vigente sin subir una nueva en su lugar. La eliminación SHALL requerir una confirmación explícita y SHALL borrar sus archivos derivados y su original sin dejar huérfanos.

#### Scenario: Eliminación con confirmación

- **WHEN** el anfitrión solicita quitar la foto principal de inicio y confirma la acción
- **THEN** sus archivos derivados y su original dejan de existir en el almacenamiento, y la página de inicio vuelve a mostrar la imagen de reserva

### Requirement: Imagen de reserva mientras no haya foto propia

Mientras el anfitrión no haya cargado ninguna foto principal de inicio, el sitio SHALL mostrar una imagen de reserva fija incluida en el propio código, de forma que la página de inicio nunca quede sin imagen principal.

#### Scenario: Sitio recién instalado, sin foto cargada

- **WHEN** un visitante abre la página de inicio antes de que el anfitrión haya cargado una foto principal
- **THEN** ve la imagen de reserva a pantalla completa en el lugar del hero

### Requirement: Publicación sin redeploy

Los cambios sobre la foto principal de inicio (carga, reemplazo o eliminación) SHALL reflejarse en el sitio público en la siguiente carga de la página, sin necesidad de un nuevo despliegue de la aplicación.

#### Scenario: Cambio visible de inmediato

- **WHEN** el anfitrión reemplaza la foto principal de inicio
- **THEN** un visitante que carga la página de inicio inmediatamente después ve la foto nueva

### Requirement: Uso como vista previa por defecto del sitio

La imagen de vista previa para redes sociales y mensajería de la página de inicio, y la de cualquier página pública que no tenga una imagen propia más específica, SHALL ser la foto principal de inicio vigente (o la imagen de reserva, si no hay ninguna cargada).

#### Scenario: Enlace de inicio compartido por WhatsApp

- **WHEN** alguien comparte el enlace de la página de inicio en una conversación, después de que el anfitrión cargó una foto principal propia
- **THEN** la vista previa del enlace muestra esa foto
