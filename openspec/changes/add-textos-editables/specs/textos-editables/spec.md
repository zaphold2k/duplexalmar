## Purpose

Define cómo el anfitrión mantiene, desde el panel privado, los textos de contenido del sitio público —la presentación de inicio y las secciones de cada casa— en texto plano, sin tocar código ni depender de un redeploy, y cómo el sitio vuelve al texto original cuando no hay uno editado.

## ADDED Requirements

### Requirement: Secciones de texto editables

El sistema SHALL exponer como editables exactamente estas secciones de texto: en el inicio, la presentación breve del lugar; en cada casa, la descripción, la capacidad, lo que la distingue, los servicios y las condiciones de la estadía ("Para tener en cuenta"). Cada sección SHALL identificarse por un nombre estable, y la del inicio y las de cada casa SHALL ser independientes entre sí.

Los títulos de las secciones, el nombre de cada casa y su frase corta distintiva NO SHALL ser editables desde el panel.

#### Scenario: Secciones ofrecidas en el panel de una casa

- **WHEN** el anfitrión abre el panel de una casa
- **THEN** encuentra un campo de edición para cada una de las cinco secciones de esa casa, y ninguno para el título de las secciones, el nombre de la casa ni su frase corta

#### Scenario: Sección del inicio

- **WHEN** el anfitrión abre el panel principal
- **THEN** encuentra un campo de edición para la presentación breve del inicio

#### Scenario: Sección inexistente

- **WHEN** llega una petición de guardado para una sección o un ámbito que no existe
- **THEN** el sistema la rechaza con un estado de petición inválida y no modifica ningún texto

### Requirement: Acceso restringido a la edición de textos

Toda operación de escritura sobre los textos SHALL requerir una sesión válida, con el mismo mecanismo que el resto del panel, y SHALL rechazar peticiones no autenticadas sin modificar nada.

#### Scenario: Guardado sin sesión

- **WHEN** llega una petición de guardado o de vuelta al original sin una sesión válida
- **THEN** el sistema la rechaza con un estado de no autorizado y el texto publicado no cambia

### Requirement: Valor inicial y texto de reserva

Mientras el anfitrión no haya guardado un texto para una sección, el sistema SHALL mostrar en el sitio público el texto original de esa sección, definido en el código, y SHALL precargar ese mismo texto en el campo de edición del panel.

#### Scenario: Sitio sin ningún texto editado

- **WHEN** un visitante abre el inicio o la página de una casa y el anfitrión nunca guardó textos
- **THEN** el sitio muestra exactamente los textos originales en todas las secciones

#### Scenario: Campo de edición precargado

- **WHEN** el anfitrión abre el campo de una sección que nunca editó
- **THEN** el campo contiene el texto original completo, listo para modificar

### Requirement: Guardado y publicación sin redeploy

El anfitrión SHALL poder modificar el texto de una sección y guardarlo. Al guardar, el sistema SHALL persistir el texto de esa sección de forma que sobreviva a reinicios del proceso y SHALL publicarlo en el sitio en la siguiente petición, sin redeploy. Guardar una sección NO SHALL alterar el texto de ninguna otra sección ni de otro ámbito.

El sistema SHALL confirmar el guardado al anfitrión o, si falla, SHALL informarlo con un mensaje explícito sin perder lo que escribió.

#### Scenario: Guardado de una sección

- **WHEN** el anfitrión modifica el texto de los servicios de la Casa Rosa y guarda
- **THEN** la página pública de la Casa Rosa muestra el texto nuevo en su próxima carga, y las demás secciones de esa casa y las de la Casa Verde siguen igual

#### Scenario: Persistencia tras reinicio

- **WHEN** el proceso se reinicia después de un guardado
- **THEN** el sitio sigue mostrando el texto guardado

#### Scenario: Fallo al guardar

- **WHEN** el guardado falla
- **THEN** el panel muestra un mensaje de error y el texto escrito permanece en el campo

### Requirement: Formato de texto plano

Los textos SHALL tratarse como texto plano: cualquier marca de HTML u otro formato que escriba el anfitrión SHALL mostrarse literalmente en el sitio y nunca interpretarse. El sistema SHALL presentar cada sección según su tipo:

- Presentación de inicio y descripción de una casa: párrafos, separados en el texto por una línea en blanco.
- Capacidad, lo que la distingue, servicios y condiciones de la estadía: lista, un ítem por línea; las líneas vacías se ignoran.

El sistema SHALL rechazar un texto que supere un límite de longitud razonable para una sección, informando el límite.

#### Scenario: Descripción con varios párrafos

- **WHEN** el anfitrión guarda una descripción con dos bloques de texto separados por una línea en blanco
- **THEN** la página de la casa los muestra como dos párrafos

#### Scenario: Lista de servicios

- **WHEN** el anfitrión guarda los servicios con un servicio por línea
- **THEN** la página de la casa muestra un ítem de lista por cada línea no vacía, en el mismo orden

#### Scenario: Texto con marcas

- **WHEN** el anfitrión escribe en un texto algo con forma de etiqueta HTML
- **THEN** el sitio lo muestra tal cual, como caracteres, sin interpretarlo

#### Scenario: Texto demasiado largo

- **WHEN** el anfitrión intenta guardar un texto que supera el límite de longitud
- **THEN** el sistema lo rechaza indicando el límite y el texto publicado no cambia

### Requirement: Vuelta al texto original

El anfitrión SHALL poder descartar el texto editado de una sección y volver al original, con una confirmación explícita. Tras volver al original, el sitio SHALL mostrar el texto del código y el campo del panel SHALL volver a precargarlo. Volver al original de una sección que nunca se editó NO SHALL fallar.

#### Scenario: Volver al original

- **WHEN** el anfitrión confirma volver al texto original de la descripción de una casa que había editado
- **THEN** la página pública vuelve a mostrar la descripción original en su próxima carga

#### Scenario: Sección nunca editada

- **WHEN** el anfitrión vuelve al original de una sección que nunca editó
- **THEN** la operación se completa sin error y el texto sigue siendo el original

### Requirement: Panel usable en el celular

Los campos y controles de edición de textos SHALL cumplir el objetivo táctil mínimo y SHALL seguir siendo usables con el tamaño de texto del sistema en su ajuste máximo, igual que el resto del panel (ver capability `admin-imagenes`, "Panel usable con texto agrandado en el celular").

#### Scenario: Edición desde el celular con texto agrandado

- **WHEN** el anfitrión edita un texto desde su celular con el tamaño de texto del sistema al máximo
- **THEN** el campo muestra el texto completo sin recortes, y los botones de guardar y de volver al original se pueden pulsar
