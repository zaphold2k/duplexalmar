## Purpose

Define qué exige la imagen del sitio del entorno que la corre en producción, cómo una versión publicada se aplica y se revierte, y cómo el sitio queda publicado con TLS, sin fijar en este repositorio ningún detalle de la infraestructura que lo hospeda.

## ADDED Requirements

### Requirement: Contrato de ejecución de la imagen

El repositorio SHALL documentar qué necesita la imagen para correr en producción, de modo que cualquier entorno pueda cumplirlo sin leer el código. El contrato SHALL incluir: un volumen persistente montado en la ruta de datos, escribible por el usuario sin privilegios de la imagen; la configuración sensible por variables de entorno, sin valores dentro de la imagen; que el contenedor no necesita publicar puertos y es alcanzable sólo desde la red interna del entorno; el healthcheck que indica que el sitio responde; un límite de memoria; y que delante hay un proxy que termina TLS. Las versiones publicadas SHALL ser compatibles con los datos escritos por otra versión de este change, porque su formato no cambia.

#### Scenario: Entorno que cumple el contrato

- **WHEN** se corre la imagen con el volumen de datos, las variables de entorno requeridas y el proxy delante
- **THEN** el sitio queda operativo sin ningún paso adicional específico de la imagen

#### Scenario: Falta la configuración obligatoria

- **WHEN** se arranca el contenedor sin alguna variable de entorno requerida
- **THEN** el proceso termina al arrancar nombrando la variable que falta, en vez de fallar en la primera petición

#### Scenario: Volumen de datos con dueño incorrecto

- **WHEN** el volumen de datos no es escribible por el usuario sin privilegios de la imagen
- **THEN** el fallo es visible en el arranque o en la primera escritura, y el contrato documenta cómo preparar el volumen

### Requirement: El despliegue vive en el repo de despliegue

El procedimiento de despliegue SHALL estar definido y documentado en el repositorio de despliegue con Ansible que ya administra el entorno, siguiendo sus convenciones, y NO SHALL replicarse en este repositorio: este repositorio SHALL limitarse a nombrar la imagen publicada y el contrato de ejecución. La definición del servicio allá SHALL fijar la imagen a una versión concreta del registro, nunca a `latest`, al nombre de una rama ni a ninguna otra etiqueta móvil. La versión que corre SHALL leerse de la etiqueta fijada, no de lo que la imagen declare en su manifiesto.

#### Scenario: Lector de este repositorio

- **WHEN** alguien busca en este repositorio cómo se despliega el sitio
- **THEN** encuentra la imagen publicada, el contrato de ejecución y la indicación de que el procedimiento está en el repo de despliegue, sin detalles de inventarios, hosts ni rutas

#### Scenario: Imagen siempre fijada

- **WHEN** se revisa la definición del servicio en el repo de despliegue
- **THEN** la imagen lleva una versión concreta —estable `X.Y.Z` o una pre-release completa— y no `latest` ni el nombre de una rama

### Requirement: Aplicar y revertir una versión

Llevar una versión a producción SHALL consistir en fijar esa versión en la definición del servicio, dejar el cambio en el historial del repo de despliegue y correr el playbook acotado a esta app. El procedimiento SHALL ofrecer un ensayo previo que muestre lo que cambiaría sin aplicarlo, y SHALL terminar en error sin afectar lo que está corriendo si la versión pedida no existe en el registro. Revertir SHALL ser el mismo procedimiento con la versión anterior, sin pasos adicionales y sin tocar los datos.

#### Scenario: Despliegue de una versión nueva

- **WHEN** se aplica una versión publicada
- **THEN** el entorno queda corriendo esa versión, los datos quedan intactos y el cambio de versión queda registrado en el historial del repo de despliegue

#### Scenario: Versión inexistente

- **WHEN** se aplica una versión que no está publicada en el registro
- **THEN** el despliegue falla al bajar la imagen, lo que estaba corriendo sigue corriendo y el cambio no queda aplicado

#### Scenario: Ensayo sin aplicar

- **WHEN** se corre el ensayo previo
- **THEN** se ve lo que cambiaría y no se modifica nada

#### Scenario: Vuelta atrás

- **WHEN** tras desplegar una versión se aplica la anterior
- **THEN** el sitio vuelve a esa versión con las mismas fotos, portadas y orden que tenía

### Requirement: Publicación con TLS detrás de un proxy

El sitio SHALL publicarse en Internet exclusivamente a través del proxy del entorno, que termina TLS y reenvía al contenedor por la red interna. El sitio SHALL respetar el protocolo y el host originales que informa ese proxy, de modo que las peticiones de escritura del panel (subir, reordenar, borrar) funcionen detrás de él y no sean rechazadas por la protección contra peticiones de origen cruzado.

#### Scenario: Panel operativo detrás del proxy

- **WHEN** el anfitrión inicia sesión en el panel por la dirección pública y sube una foto
- **THEN** la subida se acepta y la foto aparece en el sitio público

#### Scenario: Imágenes servidas con caché

- **WHEN** un navegador pide una imagen del sitio por la dirección pública
- **THEN** la recibe con caché pública inmutable, igual que la sirve la app en local

#### Scenario: Lote de subida dentro del límite del proxy

- **WHEN** el anfitrión sube el lote más grande que el panel permite según su configuración de entorno
- **THEN** la petición no supera el límite de tamaño del proxy y la subida se completa
