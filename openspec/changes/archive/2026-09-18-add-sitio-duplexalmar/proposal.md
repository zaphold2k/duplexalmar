## Why

"Las Petras — Casas de Mar" son dos casas de playa en El Marquesado (zona sur de Mar del Plata) que se alquilan por temporada y hoy no tienen presencia web propia: las consultas dependen de compartir un álbum de fotos a mano. Se necesita un sitio de presentación que muestre bien las dos casas y su entorno, y que canalice las consultas por WhatsApp.

El punto crítico es que **las fotos envejecen con la temporada**: el pasto, la luz y el estado del predio cambian entre verano e invierno. Si actualizar las fotos requiere tocar código o hacer un deploy, en la práctica no se hace. Por eso el sitio necesita, desde la v1, un panel privado que permita reemplazar la portada y la galería de cada casa desde el celular.

## What Changes

- **Sitio público nuevo** (español, mobile-first) con:
  - Home: hero a pantalla completa, presentación breve, acceso a las dos casas, ubicación y contacto.
  - Una página por casa (`Casa Rosa` y `Casa Verde`): portada, descripción, galería con lightbox, servicios, capacidad y CTA a WhatsApp.
  - Sección de ubicación con mapa y referencias de la zona (El Marquesado, playas del antiguo balneario, Playa La Escondida).
  - Contacto exclusivamente por **WhatsApp** (link con mensaje prellenado) y correo. Sin formulario ni envío de mail desde el servidor.
- **Panel de administración privado** (`/admin`) con login de un solo usuario, que permite por casa:
  - subir fotos desde el celular (múltiples por lote),
  - marcar cuál es la portada,
  - reordenar la galería,
  - editar el texto alternativo de cada foto,
  - eliminar fotos.
- **Pipeline de procesamiento de imágenes** en el servidor: conversión de HEIC (formato nativo del iPhone) a WebP, corrección de orientación por EXIF, borrado de metadata (incluida la geolocalización), y generación de variantes por tamaño para servir `srcset`.
- **Persistencia sin base de datos**: el estado mutable (orden de la galería, cuál es la portada, alt text) vive en un manifest JSON por casa sobre un volumen; las imágenes procesadas y los originales viven en ese mismo volumen.
- **Empaquetado en Docker Compose**: un contenedor de aplicación (Astro en modo servidor) más un reverse proxy, con volumen persistente para `/data`.
- **Accesibilidad reforzada para texto agrandado**: el sitio y sobre todo el panel deben seguir siendo usables con Dynamic Type al máximo en iPhone (tipografía en unidades relativas, objetivos táctiles grandes, layout de una columna, reordenamiento por botones y no sólo por arrastre).

### Non-goals (explícitamente fuera de la v1)

- Motor de reservas, calendario de disponibilidad o sincronización con Airbnb/Booking.
- Publicación de precios o tarifas por temporada.
- Edición de los textos de las casas desde el panel: en la v1 los textos viven en el código.
- Multi-idioma. El sitio es sólo en español.
- Despliegue en `duplexalmar.com.ar`, certificados TLS y DNS. Se contempla en el diseño pero se ejecuta en un change posterior.
- Multiusuario, roles o recuperación de contraseña en el panel.
- El container que está en el predio no forma parte de la oferta publicada.

## Capabilities

### New Capabilities

- `sitio-publico`: Páginas públicas del sitio (home, casas, ubicación, contacto), su estructura, la navegación, el CTA de WhatsApp y los requisitos de presentación mobile-first y accesibilidad.
- `galeria-casas`: Modelo de contenido de las imágenes de cada casa: portada, orden de la galería, texto alternativo, variantes de tamaño y cómo se sirven al visitante.
- `admin-imagenes`: Panel privado de administración: autenticación, subida de fotos desde el celular, procesamiento de las imágenes, y las operaciones de portada, orden y borrado.

### Modified Capabilities

Ninguna. Es un proyecto nuevo, sin specs previos.

## Impact

- **Repositorio**: `git@github.com:zaphold2k/duplexalmar.git`. Proyecto nuevo, se arranca en una rama `feature/` y se integra a `main` después.
- **Stack**: Astro con `output: server` y adapter `@astrojs/node`, Node.js. `sharp` (libvips con soporte HEIF) para el procesamiento de imágenes.
- **Infraestructura**: `docker-compose.yml` con el servicio de aplicación y un reverse proxy; un volumen persistente montado en `/data` que contiene los manifests, los originales y las variantes generadas.
- **Configuración**: variables de entorno para las credenciales del panel, el secreto de firma de sesión, el número de WhatsApp y los límites de subida.
- **Operación**: el respaldo del sitio se reduce a copiar el volumen `/data`. No hay servidor de base de datos que operar.
- **Contenido pendiente**: número de WhatsApp, usuario de Instagram, detalle de servicios y capacidad de cada casa, y reglas de la estadía. Se construye con textos de relleno y se reemplazan sin cambios de arquitectura.
