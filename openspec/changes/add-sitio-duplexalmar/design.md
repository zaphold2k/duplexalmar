## Context

Ver `proposal.md — Why` para la motivación. Restricciones que dan forma al enfoque:

- **Un solo operador, sin equipo técnico.** El anfitrión actualiza las fotos desde su iPhone, en general fuera de temporada o al empezar una. Todo lo que requiera una terminal para operar, en la práctica no se va a hacer.
- **Volumen chico y estable.** Dos casas, del orden de 20 a 40 fotos por casa, un puñado de escrituras por temporada, un solo autor. No hay concurrencia real de escritura.
- **El origen de las fotos es un iPhone.** Eso implica HEIC, archivos de 3 a 6 MB, orientación en EXIF y geolocalización embebida.
- **El anfitrión usa el iPhone con el texto agrandado.** No es una preferencia estética: si el panel se rompe con Dynamic Type al máximo, el panel no sirve.
- **Las visitas llegan mayormente por celular y por enlace compartido en WhatsApp**, muchas veces con conexión móvil en la costa. El peso de la página importa.
- **El despliegue es posterior.** El diseño tiene que dejarlo preparado (variables de entorno, volumen, proxy) sin ejecutarlo.
- Repositorio: `git@github.com:zaphold2k/duplexalmar.git`. Se trabaja en una rama `feature/` y se integra a `main`.

## Goals / Non-Goals

**Goals:**

- Que cambiar la portada y la galería de una casa sea una tarea de dos minutos desde el celular, sin deploy y sin asistencia técnica.
- Que el sitio cargue rápido en conexión móvil y se vea bien al compartirlo por WhatsApp.
- Que el respaldo completo del contenido sea copiar un directorio.
- Que el panel siga siendo operable con Dynamic Type en su ajuste máximo, verificado en un iPhone real y no sólo en el emulador del navegador.
- Que la aplicación corra como un único servicio, para que levantarla o moverla de servidor sea `docker compose up`.

**Non-Goals (a nivel de diseño; el alcance del producto está en el proposal):**

- No se introduce un servidor de base de datos ni un ORM.
- No se introduce una capa de caché ni una CDN. El proxy alcanza para el tráfico esperado.
- No se diseña para múltiples instancias de la aplicación en paralelo. El diseño asume un único proceso escritor.
- No se construye un sistema de plantillas ni un CMS genérico. El modelo es específico de estas dos casas.

## Decisions

### 1. Astro en modo servidor, un único servicio

Astro con `output: 'server'` y el adapter `@astrojs/node` en modo `standalone`. Las páginas públicas se renderizan en el servidor leyendo el manifest en cada petición; el panel y los endpoints de escritura viven en el mismo proyecto bajo `/admin` y `/api`.

**Por qué:** un solo artefacto, un solo contenedor, un solo `Dockerfile`. Las páginas públicas quedan HTML plano con CSS y muy poco JavaScript, que es exactamente lo que conviene para un sitio de fotos consumido en conexión móvil.

**Alternativas consideradas:**

- *Sitio estático con rebuild al guardar.* Requiere orquestar un build disparado desde el panel y un mecanismo de publicación. Más partes móviles y una ventana de inconsistencia entre guardar y ver el cambio, a cambio de una ganancia de rendimiento que a este volumen es irrelevante. Descartada.
- *CMS headless (Strapi, Directus, Payload).* Resuelve el panel gratis, pero suma un servicio, una base de datos y un modelo de datos genérico para administrar dos casas. Desproporcionado. Descartada.
- *WordPress.* La biblioteca de medios haría el trabajo, pero el costo real se muda a mantener PHP actualizado y a pelear con un tema para lograr la estética buscada. Descartada.
- *CMS sobre git (Decap).* Metería fotos binarias en el repositorio, que crecería sin techo temporada tras temporada. Descartada.

### 2. Manifest JSON por casa en lugar de base de datos

El estado mutable vive en un archivo por casa: `/data/houses/casa-rosa.json` y `/data/houses/casa-verde.json`.

```jsonc
{
  "version": 1,
  "cover": "01J9F2K8QX",              // id de imagen, o null
  "gallery": ["01J9F2K8QX", "01J9F2M3RT"],  // el array define el orden
  "images": {
    "01J9F2K8QX": {
      "alt": "Galería con vista al mar",
      "width": 4032, "height": 3024,
      "originalExt": "heic",
      "uploadedAt": "2026-09-07T23:40:00Z"
    }
  }
}
```

**Por qué:** el estado es diminuto, de un solo autor y sin consultas. Un JSON legible a ojo hace que el respaldo, la inspección y la reparación manual sean triviales, y elimina un servicio y un driver del sistema.

**Escritura segura:** se serializa con un mutex en proceso y se persiste escribiendo a un archivo temporal en el mismo sistema de archivos y renombrando sobre el destino. El rename es atómico, así que un corte de energía deja el manifest anterior íntegro, nunca uno truncado.

**Alternativa considerada:** *SQLite.* Es la opción correcta en el momento en que aparezca disponibilidad, reservas o precios por temporada, porque ahí sí hay consultas y relaciones. Hoy sólo agrega un driver para guardar un array ordenado. Se difiere; el `version` del manifest deja abierta la migración.

### 3. Decodificación de HEIC desacoplada de `sharp`

`sharp` hace todo el procesamiento (redimensionado, conversión a WebP, orientación, borrado de metadata) **excepto** decodificar HEIC. Las binarias precompiladas de `sharp` no incluyen soporte HEIF por las patentes de HEVC, así que se resuelve aparte: cuando el archivo entrante es HEIC, se decodifica primero con una librería basada en `libheif` compilada a WebAssembly y el resultado se le entrega a `sharp` como píxeles; cualquier otro formato entra directo a `sharp`.

**Por qué:** mantiene la imagen de Docker sobre una base estándar de Node, sin compilar `libvips` con `libheif` a mano ni arrastrar dependencias del sistema que después hay que sostener. El costo es que decodificar HEIC es más lento y consume más memoria, lo cual es aceptable para lotes de decenas de fotos que se suben tres veces al año.

**Alternativa considerada:** *imagen base Debian con `libvips` compilado con `libheif` y `SHARP_FORCE_GLOBAL_LIBVIPS=1`.* Más rápido y con un solo camino de código, pero ata el proyecto a una imagen base pesada y a un build frágil de mantener. Si el rendimiento llegara a molestar, es la salida natural.

**Nota:** Safari en iOS suele transcodificar HEIC a JPEG al subir desde el selector de fotos, pero no siempre: compartiendo desde Archivos o según la configuración de cámara llega el HEIC crudo. Hay que soportar ambos caminos, no asumir la conversión.

### 4. Formato y variantes de salida

Salida **WebP** en cuatro anchos: 480, 900, 1600 y 2400 píxeles. Nunca se agranda una imagen: si el original es más chico que un ancho, esa variante se omite y el `srcset` sólo declara las que existen.

Se conserva el **archivo original** tal como llegó. Ocupa espacio, pero permite regenerar todas las variantes si más adelante cambian los anchos o el formato, sin pedirle al anfitrión que vuelva a subir nada.

**Por qué WebP solo:** soporte universal en los navegadores vigentes, aproximadamente la mitad del peso de un JPEG equivalente, y un único camino de código. Agregar AVIF duplicaría el tiempo de procesamiento y el espacio para una ganancia marginal.

**Nombres de archivo e inmutabilidad:** cada imagen recibe un identificador único al subirse, y los archivos derivados lo llevan en el nombre (`<id>-900.webp`). Un identificador nunca se reutiliza ni cambia de contenido, así que las imágenes se sirven con caché inmutable de larga duración. Cambiar la portada no invalida ninguna caché: cambia a qué identificador apunta el HTML.

### 5. Disposición del almacenamiento

Todo el contenido mutable vive bajo un único punto de montaje:

```
/data
  houses/
    casa-rosa.json
    casa-verde.json
  images/
    casa-rosa/
      01J9F2K8QX.orig.heic
      01J9F2K8QX-480.webp
      01J9F2K8QX-900.webp
      01J9F2K8QX-1600.webp
      01J9F2K8QX-2400.webp
    casa-verde/
      ...
```

**Por qué:** respaldar es copiar `/data`; restaurar es descomprimirlo sobre una instalación limpia. No hay estado repartido entre una base de datos y un sistema de archivos que puedan quedar desincronizados.

**Reparación de huérfanos:** el manifest es la fuente de verdad. Un archivo en `images/` que ningún manifest referencia es un huérfano, resultado posible de un corte durante la subida. Se contempla un comando de mantenimiento que los liste y los elimine; no se borran automáticamente, para que un error de escritura del manifest no se lleve puestas las fotos.

### 6. Escritura del manifest después de procesar, no antes

Una foto se agrega al manifest recién cuando todas sus variantes están escritas en disco. Si el procesamiento falla o la conexión se corta, quedan archivos huérfanos pero el manifest nunca referencia una imagen incompleta.

**Por qué:** garantiza el requisito de que el sitio público sólo muestre imágenes completamente procesadas, y hace que un reintento sea seguro. El precio es la basura ocasional en disco, que es exactamente lo que resuelve el comando de mantenimiento del punto anterior.

### 7. Autenticación: sesión en memoria con cookie firmada

Un único usuario. El despliegue provee por variables de entorno el nombre de usuario, el **hash** de la contraseña y un secreto de firma. Al iniciar sesión correctamente, el servidor genera un identificador de sesión aleatorio, lo guarda en un mapa en memoria y lo entrega en una cookie `HttpOnly`, `Secure`, `SameSite=Lax` con vencimiento. Cerrar sesión elimina la entrada del mapa y la cookie.

**Por qué la sesión en memoria y no un token autocontenido:** permite revocar de verdad. Cerrar sesión invalida el identificador del lado del servidor, así que volver atrás en el navegador no restablece el acceso, que es lo que pide el spec. La contrapartida es que reiniciar la aplicación cierra la sesión; para un usuario que entra unas pocas veces al año, es intrascendente.

**Contraseña:** se almacena hasheada con una función de derivación con costo configurable, nunca en texto plano. No hay recuperación: si se pierde, se cambia la variable de entorno y se reinicia el contenedor.

**Limitación de intentos:** contador por dirección de origen en memoria, con demora creciente. Suficiente contra fuerza bruta oportunista a esta escala.

**Alternativa considerada:** *Basic Auth en el proxy.* Cero código, pero el navegador móvil ofrece una experiencia de inicio de sesión pobre, no permite cerrar sesión de forma limpia y no deja controlar la limitación de intentos. Descartada, aunque queda como red de seguridad si hiciera falta endurecer el acceso rápidamente.

### 8. Dynamic Type: el tamaño base lo decide el usuario

En iOS, el ajuste de texto del sistema **no** afecta a una página web salvo que la página se suscriba explícitamente. La suscripción es declarar la tipografía del elemento raíz con la fuente de sistema `-apple-system-body`, que trae el tamaño que el usuario eligió; después se vuelve a fijar la familia tipográfica en `body` y todo lo demás se expresa en unidades relativas, de modo que la escala completa acompaña.

Consecuencias que el diseño asume:

- Ninguna medida tipográfica en píxeles absolutos.
- Ninguna altura fija en contenedores que albergan texto; se usa altura mínima.
- La meta etiqueta de viewport **no** fija `maximum-scale` ni `user-scalable=no`, para no bloquear el zoom.
- El panel se dispone en una sola columna en celular, con botones de ancho completo y etiquetas de texto además del ícono.
- El reordenamiento de la galería se opera con botones discretos de mover hacia adelante y hacia atrás. Arrastrar y soltar, si se agrega, es un atajo adicional, nunca el único camino: con el texto agrandado los objetivos se vuelven difíciles de manipular con precisión.

**Riesgo asumido y su límite:** con el ajuste de accesibilidad máximo, el tamaño base puede superar los 50 píxeles y desarmar cualquier layout. Se acota el crecimiento del tamaño raíz con un tope, de modo que la página siga escalando de forma perceptible sin volverse inutilizable. El tope se calibra probando en un dispositivo real.

### 9. Contenido de las casas en el código, tipado

Los textos, servicios y capacidad de cada casa viven en un módulo de datos tipado dentro del repositorio, con `casa-rosa` y `casa-verde` como claves. El panel no los edita.

**Por qué:** cambian una vez por año a lo sumo, y ponerlos bajo control de versiones da revisión e historial gratis. Construir la edición de textos costaría más que el problema que resuelve. El tipado hace que agregar un campo obligue a completarlo en ambas casas.

Los textos definitivos todavía no están disponibles, así que se implementa con contenido de relleno claramente marcado. Reemplazarlo no toca la arquitectura.

### 10. Caché y encabezados

- Variantes y originales bajo `/images/`: caché pública inmutable de un año. Es seguro porque el nombre del archivo contiene un identificador que nunca cambia de contenido.
- Páginas HTML: sin caché compartida de larga duración, para que un cambio de portada se vea en la siguiente carga. Se acepta renderizar en cada petición; a este volumen el costo es nulo.

### 11. Docker Compose

Dos servicios: la aplicación y un reverse proxy. Un volumen nombrado montado en `/data`.

```
  +----------------+        +---------------------------+
  |  proxy         |------->|  app                      |
  |  TLS, /images  |        |  Astro server (Node)      |
  +----------------+        +-------------+-------------+
                                          |
                                   volumen |  /data
                                          v
                            houses/*.json  +  images/**
```

El proxy sirve `/images/` directamente desde el volumen, sin pasar por Node. La configuración sensible entra por variables de entorno; el repositorio incluye un archivo de ejemplo y **no** incluye valores reales.

En desarrollo, `/data` se monta como enlace al directorio local para poder inspeccionar los archivos generados a mano.

La elección del proxy y la emisión de certificados se resuelven en el change de despliegue. Este diseño sólo exige que el proxy pueda servir estáticos desde el volumen y reenviar el resto.

## Risks / Trade-offs

- **El soporte de HEIC es la parte más frágil del sistema.** → Se aísla en un único módulo de decodificación con una interfaz mínima, se cubre con una prueba automatizada que procese un archivo HEIC real, y se deja documentada la salida alternativa de compilar `libvips` con `libheif`.
- **Subir un lote de fotos grandes desde un celular puede agotar la memoria del contenedor.** → Se procesan las fotos de a una en lugar de en paralelo, se impone un tope de tamaño por archivo y de cantidad por lote, y se define un límite de memoria explícito en Compose para que una subida desmedida falle de forma contenida en vez de tumbar el servicio.
- **Conservar los originales hace crecer el disco sin límite temporada tras temporada.** → A la escala esperada son unos pocos gigabytes en varios años, muy por debajo de cualquier servidor razonable. El comando de mantenimiento reporta el espacio ocupado para que el crecimiento sea visible antes de ser un problema.
- **`/data` es un punto único de fallo: si se pierde el volumen, se pierden todas las fotos publicadas.** → Los originales siguen estando en el iPhone del anfitrión, así que la pérdida es recuperable con trabajo manual. Aun así, el respaldo periódico de `/data` fuera del servidor es un requisito operativo que el change de despliegue debe resolver.
- **Un único proceso escritor es un supuesto implícito del manifest.** → Escalar a más de una réplica corrompería el estado en silencio. Se documenta en el propio manifest y se deja como criterio de migración a SQLite.
- **El panel expone un endpoint de subida de archivos a internet.** → Autenticación obligatoria en cada petición de escritura, validación del contenido real del archivo y no de su extensión ni del tipo declarado por el cliente, topes de tamaño y de cantidad, y nombres de archivo generados por el servidor y nunca derivados del nombre que envía el cliente.
- **Renderizar en el servidor en cada petición hace al sitio dependiente de que la aplicación esté viva.** → Es un sitio de presentación de dos casas, no un servicio crítico. La simplicidad de un solo proceso vale más que la disponibilidad extra de un sitio estático.
- **La estética de referencia es un hotel de lujo, pero las casas son rústicas.** → Se toma de la referencia la estructura y la prolijeza de la presentación, no el registro aspiracional. Presentar como lujoso lo que es una casa de playa sencilla genera expectativas que la estadía desmiente. La honestidad visual es una decisión de diseño, no una limitación.

## Migration Plan

No hay sistema previo que migrar: es una instalación nueva.

Secuencia de puesta en marcha, a ejecutar en el change de despliegue:

1. Levantar la aplicación con el volumen `/data` vacío. El sitio debe renderizar las dos casas en estado sin fotos, sin errores.
2. Configurar las credenciales del panel y el secreto de sesión por variables de entorno.
3. Cargar la selección inicial de fotos desde el panel, subiendo los originales desde el iPhone del anfitrión (ver el anexo, "Fotos: carga inicial y actualización"), y designar las portadas.
4. Reemplazar el contenido de relleno por los textos definitivos, el número de WhatsApp y el usuario de Instagram.
5. Recién entonces apuntar `duplexalmar.com.ar` y emitir el certificado.

**Retroceso:** como el estado vive por completo en `/data` y el código no lo modifica al arrancar, volver a una versión anterior de la imagen no afecta al contenido. Retroceder es desplegar la etiqueta anterior con el mismo volumen.

## Open Questions

- Si conviene agregar AVIF junto a WebP. Se puede decidir después de medir el peso real de las galerías; no cambia el modelo de datos ni los specs, sólo agrega variantes.
- Si el anfitrión quiere alguna medición de visitas. Si la respuesta es sí, la opción sin cookies y sin banner de consentimiento es la preferible; es aditivo y no condiciona nada de lo anterior.
- Dónde se deposita el respaldo de `/data` fuera del servidor. Es una decisión del change de despliegue.
- Si en algún momento el container del predio pasa a ofrecerse. El modelo por slug admite una tercera unidad sin cambios estructurales, pero hoy está explícitamente fuera de alcance.

## Anexo: contenido confirmado

Datos provistos por el anfitrión. Este anexo reemplaza la nota sobre contenido de relleno de la decisión 9: los campos estructurados ya están disponibles y deben cargarse en el módulo de contenido durante la tarea 4.1. La prosa descriptiva de cada casa y del entorno se redacta en la tarea 4.1 a partir de este anexo; no queda ningún dato estructural pendiente. La sección "Observado en las fotos" sale de la revisión del álbum histórico del anfitrión (41 fotos, 2020 a 2022) y fue confirmada por él punto por punto.

### Casa Rosa (`casa-rosa`) — la del frente

- Capacidad: hasta 5 personas
- 2 habitaciones, 1 baño, dos plantas
- Distribución: dormitorio matrimonial en la planta alta con salida al balcón; dormitorio con las tres camas individuales (una simple y una cucheta) en la planta baja
- Camas: 3 individuales y 1 matrimonial
- Calefacción: salamandra a leña y calefactor a gas de garrafa
- Servicios: cocina equipada (a gas de garrafa), parrilla, wifi de alta velocidad, televisor con DirecTV prepago
- Rasgos propios: balcón con vista al mar, galería con pérgola

### Casa Verde (`casa-verde`) — la de atrás

- Capacidad: hasta 3 personas
- 1 baño, dos plantas; la planta alta es un único ambiente amplio integrado (dormitorio, estar y televisor)
- Camas: 1 matrimonial y 1 sillón cama
- Calefacción: salamandra a leña y calefactor a gas de garrafa
- Servicios: cocina equipada (a gas de garrafa), parrilla, wifi de alta velocidad, televisor con DirecTV prepago
- Rasgos propios: balcón con vista al mar, galería con pérgola, hamaca paraguaya

### Condiciones comunes a ambas casas

- Ropa de cama y toallas **incluidas**
- Apto mascotas
- Horarios de ingreso y egreso flexibles
- Estacionamiento dentro del predio
- Balcón con vista al mar en la planta alta de las dos casas
- Salamandra a leña más calefactor a gas en las dos casas; cocinas y calefactores funcionan con gas de garrafa
- Televisor con DirecTV prepago en las dos casas

**Sobre el gas de garrafa:** el sitio no debe decir "gas natural". Queda a criterio del copy si se menciona la garrafa; si se menciona, hay que aclarar en el mismo lugar si el anfitrión la entrega cargada, para no generar la duda de quién la repone.

Las dos primeras son diferenciales frente a la oferta habitual de la zona y deben tener presencia propia en la página, no quedar sepultadas en una lista de servicios.

**Corrección respecto de material anterior:** el álbum de fotos histórico del anfitrión incluye la leyenda "Se deben traer sábanas y toallas". Esa condición ya no rige. Ningún texto del sitio debe reproducirla.

### Ubicación y distancias

Las casas están en El Marquesado, sobre la costa, frente al mar: **a 100 metros de la playa**, cruzando la ruta costera. Balnearios de referencia **a 10 minutos a pie**: el balneario El Marquesado y la playa La Escondida, de uso naturista.

Estado de validación de esas cifras: la costa inmediatamente enfrente se confirma con la imagen satelital y las fotos exteriores, así que los 100 metros son consistentes. Los 10 minutos a pie a los balnearios son dato del anfitrión; no se pudieron verificar con datos abiertos porque La Escondida no está geocodificada en OpenStreetMap. Antes de publicarlos como cifra, el anfitrión debería confirmarlos en Google Maps desde el celular, en modo "a pie".

| Destino | Distancia por ruta | Tiempo aproximado |
|---|---|---|
| Miramar (centro) | 10,9 km | 13 min |
| Chapadmalal | 11,8 km | 14 min |
| Mar del Plata (centro) | 35,4 km | 40 min |
| Aeropuerto de Mar del Plata | 45,9 km | 56 min |

Distancias calculadas por enrutamiento sobre datos de OpenStreetMap siguiendo la RP11. **Verificar antes de publicarlas** si se van a presentar como cifras exactas.

Nota de posicionamiento: la referencia más cercana es Miramar, no Mar del Plata. Los textos de ubicación deben ordenarse en ese orden para no generar una expectativa de cercanía a Mar del Plata que el viaje desmiente.

### Contacto

- WhatsApp: `+54 9 2235 29-3371`, en formato de enlace `wa.me/5492235293371`
- Instagram: `instagram.com/titornes`

El enlace de Instagram provisto originalmente incluía un parámetro `stkn` que es un token de sesión personal. Debe usarse únicamente la forma limpia indicada arriba; ese parámetro no puede llegar al repositorio ni al sitio.

### Observado en las fotos (álbum 2020–2022, confirmado por el anfitrión)

Lo que sigue se ve en las fotos y el anfitrión lo confirmó. Sirve para escribir la prosa y para elegir qué fotos cargar primero. Advertencia para quien vuelva al álbum: sus leyendas no son confiables a nivel de ambiente, porque hay interiores casi idénticos etiquetados con una casa y con la otra. Las dos casas comparten el mismo plano, así que eso es esperable.

**Comunes a las dos casas**

- Dos plantas cada una, de revoque pintado y techo plano. La planta baja es un ambiente integrado de cocina, comedor y estar; una escalera metálica abierta sube a la planta alta.
- Techos de vigas de tronco a la vista y piso de cerámica color terracota en planta baja.
- Cocina: cocina a gas con horno, heladera, microondas, horno eléctrico chico, pava eléctrica, termotanque eléctrico, bajo mesada de madera oscura. "Cocina equipada" se puede detallar con esto.
- Baño completo: ducha con cortina, inodoro, bidet, lavatorio con botiquín con espejo.
- Galería cubierta en planta baja, con pérgola de troncos y techo de chapa, piso de piedra partida, mobiliario de exterior y canteros con flores (agapantos, geranios). Es el espacio que más se usa y el que mejor sale en las fotos.
- Balcón de madera en la planta alta con salida por puerta corrediza desde el dormitorio, con vista al mar. La Verde, aunque está atrás, ve el mar por encima de la galería de la Rosa.
- Parrilla propia por casa: horno-parrilla redondeado de mampostería, bajo la pérgola.
- Ventanas con rejas y persianas. Matafuegos en las cocinas.

**Casa Rosa**

- El estar tiene una pared pintada de rojo ladrillo y cortinas blancas.
- Mobiliario de galería de madera de pallet: sillón de dos cuerpos, dos sillones individuales y mesa baja.

**Casa Verde**

- El estar tiene una pared revestida en piedra.
- La planta alta tiene piso de madera y funciona como un solo ambiente: cama matrimonial, sofá, mesa con sillas de mimbre, televisor y placard.
- Mobiliario de galería de troncos: mesa y bancos rústicos, y una hamaca paraguaya.

**Entorno y predio**

- Terreno grande de césped abierto, sin cerco entre las casas; el perímetro es de postes con cadena. Los autos se estacionan sobre el césped dentro del predio.
- El mar está enfrente, cruzando la ruta costera, con una franja de médano bajo entre la ruta y la arena.
- Alrededor hay casas dispersas y mucho campo abierto. Atardeceres a la vista desde el predio.
- En el predio hay además un container de vivienda (lila) y una construcción utilitaria roja con tanque de agua y antena. Ninguno de los dos se publica.

### Tono de la prosa y decoración

El anfitrión define el registro como **casa con carácter y temática playera**. Las fotos muestran una decoración náutica y de playa acumulada con los años: tabla de surf y skate en la pared, anclas en el baño, salvavidas en la fachada, gorras, cuadros de barcos, objetos de mimbre y madera. Eso es lo que la prosa debe describir: la casa tiene personalidad, no es un departamento neutro.

Nota interna para quien redacte y para quien seleccione fotos, que **no se publica**: los objetos estrictamente personales (fotografías familiares, retratos) se retiran cuando la casa se alquila. La descripción no debe mencionarlos ni prometer que estén, y las fotos que se carguen no deberían mostrarlos.

### Fotos: carga inicial y actualización

El álbum histórico es la **carga inicial** del sitio. Después el anfitrión lo va reemplazando desde el panel a medida que saca fotos nuevas; ese es exactamente el flujo para el que está diseñado el sistema, y ninguna sesión de fotos es prerrequisito del lanzamiento.

Dos cuestiones prácticas para esa carga inicial:

- **Resolución.** Lo que se puede bajar del álbum compartido de iCloud por API son derivados de a lo sumo 1024 píxeles de ancho. Con eso el pipeline sólo genera las variantes de 480 y 900, y las portadas se verán blandas en pantallas grandes. La carga inicial debería hacerla el anfitrión **desde su iPhone con los originales**, a través del panel, no desde el álbum compartido. El álbum sirve para decidir qué cargar, no como fuente de los archivos.
- **Selección.** De las 41 fotos, cargar las que muestren cada casa completa y su galería, los dormitorios con las camas hechas, la vista al mar desde el balcón y la parrilla. Dejar afuera las tomas donde domina el container, las que muestran fotos familiares, y las de baño con toallas y productos a la vista. La foto del atardecer con las dos casas iluminadas es la mejor candidata a portada de la home.

Para las fotos futuras, pautas que conviene dejar en el `README` para el anfitrión: luz de día pero no al mediodía, celular horizontal y derecho, camas hechas con la ropa de cama incluida, baños y cocinas despejados, container fuera de cuadro, y por casa como mínimo fachada, galería, estar y cocina, cada dormitorio, baño, vista desde el balcón y parrilla.
