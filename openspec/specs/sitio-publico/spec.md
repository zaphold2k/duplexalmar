# sitio-publico Specification

## Purpose

Define las páginas públicas del sitio de "Las Petras — Casas de Mar": qué información ve un visitante interesado en alquilar, cómo navega entre las dos casas, y cómo inicia una consulta. Cubre además los requisitos de presentación en celular y de accesibilidad con texto agrandado.

## Requirements

### Requirement: Estructura de páginas públicas

El sitio SHALL exponer, en español, las siguientes páginas accesibles sin autenticación: una página de inicio, una página por cada casa, y una página de ubicación. El contacto SHALL estar disponible desde cualquier página sin requerir una página propia.

Cada casa SHALL identificarse por un slug estable en la URL: `casa-rosa` y `casa-verde`. Estos slugs SHALL permanecer estables aunque cambien las fotos o los textos.

#### Scenario: Visitante llega al inicio

- **WHEN** un visitante abre la raíz del sitio
- **THEN** ve una imagen de portada a pantalla completa, el nombre "Las Petras — Casas de Mar", una presentación breve del lugar, un acceso destacado a cada una de las dos casas, una referencia a la ubicación y un acceso a contacto

#### Scenario: Visitante abre la página de una casa

- **WHEN** un visitante navega a `/casa-rosa` o `/casa-verde`
- **THEN** ve la portada de esa casa, su descripción, su galería de fotos, sus servicios, su capacidad, y una llamada a la acción para consultar

#### Scenario: Slug inexistente

- **WHEN** un visitante navega a una URL de casa que no corresponde a `casa-rosa` ni a `casa-verde`
- **THEN** el sitio responde con estado 404 y una página de error que ofrece volver al inicio

### Requirement: Consulta por WhatsApp

El sitio SHALL ofrecer WhatsApp como canal principal de consulta. Cada llamada a la acción SHALL abrir una conversación de WhatsApp con un mensaje prellenado que identifique la casa desde la que se originó la consulta.

El sitio NO SHALL incluir un formulario de contacto ni enviar correo desde el servidor.

#### Scenario: Consulta desde la página de una casa

- **WHEN** un visitante pulsa la llamada a la acción de contacto en la página de la Casa Verde
- **THEN** se abre WhatsApp con el número del anfitrión y un mensaje prellenado que menciona la Casa Verde

#### Scenario: Consulta desde el inicio

- **WHEN** un visitante pulsa la llamada a la acción de contacto en la página de inicio
- **THEN** se abre WhatsApp con un mensaje prellenado genérico que no menciona una casa en particular

#### Scenario: Acceso permanente al contacto en celular

- **WHEN** un visitante recorre la página de una casa en un celular
- **THEN** dispone de un acceso a WhatsApp visible de forma permanente sin necesidad de volver al principio de la página

### Requirement: Presentación de la ubicación

El sitio SHALL presentar la ubicación de las casas mediante un mapa y una descripción del entorno, incluyendo la referencia a El Marquesado y a las playas cercanas.

El mapa SHALL cargarse de forma que no bloquee la primera visualización de la página.

#### Scenario: Visitante consulta la ubicación

- **WHEN** un visitante abre la sección de ubicación
- **THEN** ve un mapa con la posición de las casas, una descripción de la zona, y un enlace que abre la ubicación en una aplicación de mapas externa

### Requirement: Presentación mobile-first

El sitio SHALL estar diseñado para celular como caso principal y SHALL adaptarse a pantallas mayores sin pérdida de contenido.

En ningún ancho de pantalla el cuerpo de la página SHALL desplazarse horizontalmente. El contenido ancho, como galerías o mapas, SHALL desplazarse dentro de su propio contenedor.

#### Scenario: Navegación en pantalla angosta

- **WHEN** un visitante abre cualquier página del sitio en una pantalla de 320 píxeles de ancho
- **THEN** todo el contenido es legible y accesible, y la página no se desplaza horizontalmente

### Requirement: Accesibilidad con texto agrandado

El sitio SHALL permanecer usable cuando el sistema operativo del visitante aplica un tamaño de texto aumentado, incluido el ajuste máximo de Dynamic Type en iOS.

La tipografía SHALL definirse en unidades relativas al tamaño de fuente del usuario. Ningún contenedor de texto SHALL tener una altura fija que recorte su contenido al crecer la fuente. Los objetivos táctiles SHALL medir al menos 44 por 44 píxeles CSS.

#### Scenario: Texto agrandado al máximo en iPhone

- **WHEN** un visitante con el tamaño de texto del sistema en su ajuste máximo recorre el sitio en un iPhone
- **THEN** ningún texto queda recortado ni superpuesto, los botones siguen mostrando su etiqueta completa, y todas las llamadas a la acción siguen siendo pulsables

#### Scenario: Zoom del navegador

- **WHEN** un visitante amplía la página al 200 por ciento
- **THEN** el contenido se reordena sin pérdida de información ni de funcionalidad

### Requirement: Metadatos para compartir

Cada página pública SHALL declarar un título descriptivo, una descripción, y una imagen de vista previa para redes sociales y mensajería.

La imagen de vista previa de la página de una casa SHALL ser la portada vigente de esa casa.

#### Scenario: Enlace compartido por WhatsApp

- **WHEN** alguien comparte el enlace de la Casa Rosa en una conversación
- **THEN** la vista previa muestra el nombre de la casa, una descripción breve y la portada vigente de esa casa

#### Scenario: Portada cambiada

- **WHEN** el anfitrión cambia la portada de una casa y luego se comparte el enlace de esa casa
- **THEN** la vista previa refleja la nueva portada
