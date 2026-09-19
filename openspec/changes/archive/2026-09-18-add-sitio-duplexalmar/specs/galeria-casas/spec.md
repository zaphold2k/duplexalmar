## Purpose

Define el modelo de contenido visual de cada casa: cuál es su portada, en qué orden se muestra su galería, qué texto alternativo lleva cada foto, y en qué tamaños y formato se entregan las imágenes al visitante para que la carga en celular sea liviana.

## ADDED Requirements

### Requirement: Modelo de galería por casa

Cada casa SHALL tener una colección ordenada de imágenes y, a lo sumo, una imagen designada como portada.

El orden de la galería SHALL ser explícito y determinado por el anfitrión, no derivado de la fecha de la foto ni del nombre del archivo. La portada SHALL ser una de las imágenes de la colección de esa casa.

Cada imagen SHALL tener asociado un identificador estable, sus dimensiones originales, y un texto alternativo.

#### Scenario: Galería con orden definido

- **WHEN** el sitio muestra la galería de una casa
- **THEN** las imágenes aparecen exactamente en el orden definido por el anfitrión

#### Scenario: Portada distinta de la primera de la galería

- **WHEN** el anfitrión designa como portada una imagen que no es la primera de la galería
- **THEN** el sitio usa esa imagen como portada y mantiene el orden de la galería sin alterarlo

### Requirement: Estado inicial y vacío

El sitio SHALL renderizar correctamente una casa que todavía no tiene imágenes cargadas, y una casa que tiene imágenes pero ninguna designada como portada.

#### Scenario: Casa sin imágenes

- **WHEN** un visitante abre la página de una casa cuya galería está vacía
- **THEN** la página se muestra con su texto y sus datos, sin imágenes rotas ni espacios colapsados, y con una imagen de reserva en el lugar de la portada

#### Scenario: Casa sin portada designada

- **WHEN** una casa tiene imágenes en su galería pero ninguna designada como portada
- **THEN** el sitio usa la primera imagen de la galería como portada

### Requirement: Entrega de imágenes en múltiples tamaños

Cada imagen SHALL estar disponible en varios tamaños para que el navegador descargue el más adecuado al ancho de pantalla y a la densidad de píxeles del dispositivo.

Las imágenes SHALL entregarse en un formato de compresión moderna soportado por los navegadores actuales. Las imágenes SHALL declarar sus dimensiones para que el navegador reserve el espacio antes de descargarlas.

#### Scenario: Carga en celular

- **WHEN** un visitante abre la página de una casa desde un celular con conexión móvil
- **THEN** el navegador descarga las variantes adecuadas al ancho de esa pantalla y no las de tamaño completo

#### Scenario: Estabilidad del diseño durante la carga

- **WHEN** las imágenes de una galería se están descargando
- **THEN** el contenido de la página no se desplaza al terminar de cargar cada imagen

#### Scenario: Galería extensa

- **WHEN** una casa tiene una galería numerosa
- **THEN** las imágenes que están fuera de la vista inicial se descargan de forma diferida

### Requirement: Texto alternativo

Cada imagen publicada SHALL exponer un texto alternativo. Si el anfitrión no proveyó uno, el sistema SHALL usar un texto de reserva que identifique la casa.

#### Scenario: Imagen con texto alternativo propio

- **WHEN** una imagen tiene un texto alternativo cargado por el anfitrión
- **THEN** el sitio publica ese texto como alternativa textual de la imagen

#### Scenario: Imagen sin texto alternativo

- **WHEN** una imagen no tiene texto alternativo cargado
- **THEN** el sitio publica un texto de reserva que menciona la casa a la que pertenece la imagen

### Requirement: Visualización ampliada de la galería

El visitante SHALL poder ampliar una imagen de la galería y recorrer las demás imágenes de esa casa desde la vista ampliada.

La vista ampliada SHALL poder cerrarse y SHALL ser operable tanto con gestos táctiles como con teclado.

#### Scenario: Ampliar una imagen

- **WHEN** un visitante pulsa una imagen de la galería
- **THEN** la imagen se muestra ampliada, con controles para avanzar a la siguiente, retroceder a la anterior y cerrar la vista

#### Scenario: Recorrido con teclado

- **WHEN** un visitante con la vista ampliada abierta usa las teclas de flecha y la tecla de escape
- **THEN** avanza y retrocede entre imágenes y cierra la vista, respectivamente

### Requirement: Consistencia de las imágenes publicadas

El sitio público SHALL mostrar únicamente imágenes que existen y están completamente procesadas. Una imagen eliminada por el anfitrión SHALL dejar de aparecer en el sitio.

#### Scenario: Imagen eliminada

- **WHEN** el anfitrión elimina una imagen y un visitante recarga la página de esa casa
- **THEN** la imagen ya no aparece en la galería y el resto de la galería conserva su orden relativo

#### Scenario: Portada eliminada

- **WHEN** el anfitrión elimina la imagen que estaba designada como portada
- **THEN** el sitio deja de mostrarla y aplica la regla de portada de reserva sin quedar en un estado roto
