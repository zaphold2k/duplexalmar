## Purpose

Define el panel privado que le permite al anfitrión mantener actualizadas las fotos de cada casa a lo largo de las temporadas, subiéndolas directamente desde su celular. Cubre la autenticación, la subida y el procesamiento de las fotos, y las operaciones de portada, orden y borrado.

## ADDED Requirements

### Requirement: Acceso restringido al panel

El panel de administración SHALL requerir autenticación. Existe un único conjunto de credenciales, provisto por configuración del despliegue; el sistema NO SHALL ofrecer registro de usuarios, recuperación de contraseña ni gestión de roles.

Toda ruta del panel y toda operación de escritura sobre las imágenes SHALL rechazar peticiones no autenticadas.

#### Scenario: Acceso sin sesión

- **WHEN** alguien sin sesión abre una ruta del panel
- **THEN** el sistema lo redirige al inicio de sesión y no revela ningún dato de las casas

#### Scenario: Operación de escritura sin sesión

- **WHEN** llega una petición de subida, cambio de portada, reordenamiento o borrado sin una sesión válida
- **THEN** el sistema la rechaza con un estado de no autorizado y no modifica nada

#### Scenario: Credenciales correctas

- **WHEN** el anfitrión ingresa las credenciales correctas
- **THEN** el sistema establece una sesión y lo lleva a la selección de casa

#### Scenario: Credenciales incorrectas

- **WHEN** alguien ingresa credenciales incorrectas
- **THEN** el sistema muestra un mensaje de error que no distingue si falló el usuario o la contraseña, y no establece sesión

#### Scenario: Intentos repetidos de inicio de sesión

- **WHEN** se acumulan intentos fallidos de inicio de sesión desde un mismo origen en un lapso corto
- **THEN** el sistema demora o bloquea temporalmente los intentos siguientes

#### Scenario: Cierre de sesión

- **WHEN** el anfitrión cierra la sesión
- **THEN** la sesión queda invalidada y volver atrás en el navegador no restablece el acceso al panel

### Requirement: Subida de fotos desde el celular

El anfitrión SHALL poder seleccionar y subir varias fotos a la vez desde la galería o la cámara de su celular, asociadas a una casa determinada.

El sistema SHALL aceptar los formatos de imagen que produce un iPhone, incluido HEIC, además de JPEG y PNG. El sistema SHALL imponer un límite de tamaño por archivo y un límite de cantidad de archivos por lote, ambos configurables.

Durante la subida el sistema SHALL informar el avance y, al terminar, SHALL informar por separado cuáles fotos se cargaron y cuáles fallaron.

#### Scenario: Subida de un lote desde el iPhone

- **WHEN** el anfitrión selecciona varias fotos en formato HEIC desde su iPhone y confirma la subida
- **THEN** el sistema muestra el avance, procesa cada foto, y las agrega al final de la galería de la casa seleccionada

#### Scenario: Archivo que excede el tamaño permitido

- **WHEN** el anfitrión intenta subir una foto que supera el límite de tamaño
- **THEN** el sistema rechaza esa foto con un mensaje que indica el límite, y continúa procesando el resto del lote

#### Scenario: Archivo que no es una imagen

- **WHEN** el anfitrión intenta subir un archivo que no es una imagen válida
- **THEN** el sistema lo rechaza con un mensaje claro y no lo agrega a la galería

#### Scenario: Lote con fallas parciales

- **WHEN** en un lote algunas fotos se procesan correctamente y otras fallan
- **THEN** las que se procesaron correctamente quedan cargadas, y el sistema informa cuáles fallaron y por qué

#### Scenario: Subida interrumpida

- **WHEN** la conexión se corta durante la subida de un lote
- **THEN** la galería no queda con imágenes a medio procesar, y el anfitrión puede reintentar sin duplicar las fotos que ya se habían cargado

### Requirement: Procesamiento de las imágenes subidas

Toda imagen subida SHALL procesarse antes de quedar disponible en el sitio público.

El procesamiento SHALL convertir la imagen a un formato de compresión moderna apto para navegadores, SHALL aplicar la orientación indicada por los metadatos EXIF de modo que la imagen se vea derecha, y SHALL generar las variantes de tamaño que el sitio público necesita.

El sistema SHALL eliminar los metadatos de la imagen publicada, incluida la información de geolocalización de la cámara.

El sistema SHALL conservar el archivo original de cada foto para poder regenerar las variantes si en el futuro cambian los tamaños requeridos.

#### Scenario: Foto en HEIC

- **WHEN** el anfitrión sube una foto en formato HEIC
- **THEN** el sitio público la muestra correctamente en todos los navegadores actuales

#### Scenario: Foto tomada en vertical

- **WHEN** el anfitrión sube una foto tomada con el celular en vertical
- **THEN** la foto se muestra derecha en el sitio y en el panel, sin rotación indebida

#### Scenario: Foto con geolocalización

- **WHEN** el anfitrión sube una foto cuyos metadatos incluyen la ubicación donde fue tomada
- **THEN** la imagen publicada no expone esa ubicación ni ningún otro metadato de la cámara

### Requirement: Gestión de la portada y del orden

El anfitrión SHALL poder designar cuál de las imágenes de una casa es su portada, y SHALL poder cambiar el orden de la galería de esa casa.

El reordenamiento SHALL poder realizarse mediante controles discretos de mover hacia adelante y hacia atrás, sin depender exclusivamente de arrastrar y soltar.

Los cambios de portada y de orden SHALL reflejarse en el sitio público sin necesidad de un nuevo despliegue.

#### Scenario: Cambio de portada

- **WHEN** el anfitrión designa otra imagen como portada de una casa
- **THEN** el sitio público muestra esa imagen como portada en la siguiente carga de la página, sin redesplegar la aplicación

#### Scenario: Reordenamiento con controles discretos

- **WHEN** el anfitrión usa el control de mover una imagen hacia adelante
- **THEN** esa imagen intercambia su posición con la anterior y el nuevo orden queda guardado

#### Scenario: Cambio de temporada

- **WHEN** el anfitrión sube las fotos de la temporada nueva, designa una como portada y elimina las de la temporada anterior
- **THEN** el sitio público refleja íntegramente la galería nueva sin intervención técnica

### Requirement: Eliminación de imágenes

El anfitrión SHALL poder eliminar una imagen de la galería de una casa. La eliminación SHALL requerir una confirmación explícita.

Al eliminar una imagen, el sistema SHALL eliminar también todos sus archivos derivados y su original, de modo que no queden archivos huérfanos ocupando espacio.

#### Scenario: Eliminación con confirmación

- **WHEN** el anfitrión solicita eliminar una imagen y confirma la acción
- **THEN** la imagen desaparece de la galería y sus archivos derivados y su original dejan de existir en el almacenamiento

#### Scenario: Eliminación cancelada

- **WHEN** el anfitrión solicita eliminar una imagen y no confirma la acción
- **THEN** la imagen permanece en la galería sin cambios

### Requirement: Edición del texto alternativo

El anfitrión SHALL poder cargar y modificar el texto alternativo de cada imagen desde el panel.

#### Scenario: Carga del texto alternativo

- **WHEN** el anfitrión escribe el texto alternativo de una imagen y guarda
- **THEN** el sitio público publica ese texto como alternativa textual de esa imagen

### Requirement: Panel usable con texto agrandado en el celular

El panel SHALL ser operable desde un celular con el tamaño de texto del sistema en su ajuste máximo.

El panel SHALL disponerse en una sola columna en pantallas de celular. Los controles SHALL tener objetivos táctiles de al menos 44 por 44 píxeles CSS. Ningún control SHALL quedar recortado, superpuesto ni fuera del área visible al aumentar el tamaño del texto.

#### Scenario: Operación completa con texto agrandado

- **WHEN** el anfitrión, con el tamaño de texto del sistema en su ajuste máximo, sube fotos, cambia la portada, reordena la galería y elimina una imagen desde su iPhone
- **THEN** completa todas las operaciones sin que ningún control quede recortado, superpuesto ni inaccesible

#### Scenario: Etiquetas de los controles

- **WHEN** el panel se muestra con texto agrandado
- **THEN** cada control conserva su etiqueta completa y legible, sin depender de un ícono sin texto para transmitir su función

### Requirement: Persistencia y respaldo del contenido

El estado editado desde el panel, junto con las imágenes, SHALL persistir a través de reinicios y de nuevos despliegues de la aplicación.

El contenido SHALL residir en una ubicación de almacenamiento única y respaldable de forma independiente al código de la aplicación.

#### Scenario: Reinicio de la aplicación

- **WHEN** la aplicación se reinicia o se redespliega con una versión nueva
- **THEN** las fotos cargadas, la portada designada y el orden de la galería se conservan sin cambios

#### Scenario: Restauración desde un respaldo

- **WHEN** se restaura el almacenamiento de contenido desde una copia de respaldo sobre una instalación limpia de la aplicación
- **THEN** el sitio vuelve a mostrar las mismas fotos, portadas y orden que tenía al momento de la copia
