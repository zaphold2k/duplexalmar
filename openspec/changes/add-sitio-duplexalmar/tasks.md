## 1. Andamiaje del proyecto

- [x] 1.1 Crear la rama `feature/sitio-inicial` sobre `git@github.com:zaphold2k/duplexalmar.git` y verificar que `git status` la reporta como rama activa y limpia
- [x] 1.2 Inicializar el proyecto Astro con TypeScript en modo estricto, `output: 'server'` y el adapter `@astrojs/node` en modo `standalone`, y verificar que `npm run build` genera el servidor y `npm run preview` sirve la página inicial
- [x] 1.3 Configurar formateo y linting, y verificar que el comando de verificación corre limpio sobre el proyecto vacío
- [x] 1.4 Definir el módulo de configuración que lee y valida las variables de entorno al arrancar (credenciales del panel, secreto de sesión, número de WhatsApp, límites de subida, ruta de `/data`), y verificar con un test que un entorno incompleto falla al iniciar con un mensaje que nombra la variable faltante
- [x] 1.5 Escribir el `.env.example` con todas las variables documentadas y sin valores reales, y verificar que el `.gitignore` excluye `.env` y el directorio de datos local

## 2. Almacenamiento y manifest

- [x] 2.1 Definir el tipo del manifest de casa (`version`, `cover`, `gallery`, `images`) y su validación de esquema, y verificar con tests que un manifest malformado se rechaza con un error descriptivo
- [x] 2.2 Implementar la lectura del manifest con creación implícita del estado vacío cuando el archivo no existe, y verificar con un test que una casa sin archivo devuelve galería vacía y portada nula en lugar de fallar
- [x] 2.3 Implementar la escritura atómica del manifest mediante archivo temporal y renombrado, serializada con un mutex en proceso, y verificar con un test que escrituras concurrentes no se pisan y que el archivo destino nunca queda truncado
- [x] 2.4 Implementar las operaciones de dominio sobre el manifest (agregar imagen, designar portada, mover posición, eliminar imagen, editar texto alternativo) y verificar con tests que cubren el orden resultante, la portada de reserva cuando se elimina la portada, y el rechazo de designar como portada un identificador inexistente

## 3. Pipeline de imágenes

- [x] 3.1 Implementar el módulo de decodificación de HEIC aislado detrás de una interfaz mínima, y verificar con un test que procesa un archivo HEIC real incluido en el repositorio de pruebas
- [x] 3.2 Implementar la detección del formato real del archivo a partir de su contenido y no de su extensión ni del tipo declarado por el cliente, y verificar con tests que un archivo no imagen y un archivo con extensión engañosa se rechazan
- [x] 3.3 Implementar la generación de variantes WebP en los anchos 480, 900, 1600 y 2400, omitiendo las que superen el ancho del original, y verificar con tests que un original angosto produce sólo las variantes aplicables y que ninguna variante agranda la imagen
- [x] 3.4 Aplicar la orientación EXIF y eliminar toda la metadata en la salida, y verificar con tests que una foto vertical queda derecha y que la salida no conserva la geolocalización del original
- [x] 3.5 Implementar el guardado del original y de las variantes bajo `/data/images/<casa>/` con identificadores únicos generados por el servidor, y verificar con un test que el nombre del archivo enviado por el cliente no influye en la ruta escrita
- [x] 3.6 Implementar el procesamiento secuencial de un lote con reporte por archivo de éxito o error, escribiendo el manifest sólo después de que todas las variantes de una foto estén en disco, y verificar con un test que un fallo a mitad de lote deja cargadas las anteriores y no referencia la fallida

## 4. Contenido y sistema de diseño

- [x] 4.1 Definir el módulo tipado de contenido de las casas con `casa-rosa` y `casa-verde`, incluyendo descripción, servicios, capacidad y reglas, con textos de relleno marcados como pendientes, y verificar que el tipo obliga a completar todos los campos en ambas casas
- [x] 4.2 Definir los tokens de diseño (paleta natural de costa con acentos rosa y verde por casa, escala tipográfica en unidades relativas, espaciado) y verificar visualmente en una página de muestra que la escala completa acompaña un cambio del tamaño de fuente raíz
- [ ] 4.3 Implementar la suscripción a Dynamic Type declarando la tipografía raíz con la fuente de sistema correspondiente, restableciendo la familia en `body` y acotando el crecimiento del tamaño raíz con un tope, y verificar en un iPhone real que cambiar el tamaño de texto del sistema modifica el tamaño de la página — implementado; falta la verificación en un iPhone real (pendiente, ver resumen del hito)
- [x] 4.4 Implementar el layout base con la meta etiqueta de viewport sin restricción de zoom, y verificar que ninguna página se desplaza horizontalmente a 320 píxeles de ancho

## 5. Sitio público

- [x] 5.1 Implementar el componente de imagen responsiva que emite `srcset` con las variantes existentes, declara dimensiones para reservar el espacio y difiere la carga fuera de la vista inicial, y verificar que la página de una casa no desplaza su contenido mientras cargan las imágenes
- [x] 5.2 Implementar la página de inicio con portada a pantalla completa, presentación, acceso a las dos casas, franja de ubicación y contacto, y verificar que renderiza con el manifest vacío mostrando la imagen de reserva
- [x] 5.3 Implementar la página de casa por slug con portada, descripción, servicios, capacidad y llamada a la acción, y verificar que un slug inexistente responde 404 con una página de error que ofrece volver al inicio
- [x] 5.4 Implementar la galería con vista ampliada operable con gestos y con teclado (avanzar, retroceder, cerrar), y verificar con un test de navegador que las teclas de flecha y escape funcionan y que el foco vuelve al elemento de origen al cerrar
- [x] 5.5 Implementar la sección de ubicación con el mapa de carga diferida, la descripción de la zona y el enlace a la aplicación de mapas externa, y verificar que el mapa no bloquea la primera visualización de la página
- [x] 5.6 Implementar el acceso a WhatsApp con mensaje prellenado por contexto, incluido el acceso permanente en celular, y verificar que desde la página de cada casa el mensaje menciona esa casa y desde el inicio es genérico
- [x] 5.7 Implementar los metadatos de página y de vista previa social usando la portada vigente de cada casa, y verificar que cambiar la portada cambia la imagen declarada en la vista previa
- [x] 5.8 Configurar los encabezados de caché: inmutable de larga duración para `/images/`, sin caché compartida de larga duración para el HTML, y verificar con una petición que cada tipo de recurso responde con el encabezado esperado

## 6. Autenticación del panel

- [x] 6.1 Implementar la verificación de la contraseña contra el hash provisto por entorno y el utilitario para generar ese hash, y verificar con tests que una contraseña correcta valida y una incorrecta no
- [x] 6.2 Implementar las sesiones en memoria con cookie `HttpOnly`, `Secure` y `SameSite=Lax` con vencimiento, y verificar con tests que cerrar sesión invalida el identificador del lado del servidor y que reutilizar la cookie anterior queda rechazado
- [x] 6.3 Implementar el guardia que protege toda ruta del panel y todo endpoint de escritura, y verificar con tests que sin sesión las rutas redirigen al inicio de sesión y los endpoints responden no autorizado sin modificar estado
- [x] 6.4 Implementar la limitación de intentos de inicio de sesión por origen con demora creciente, y verificar con un test que tras varios intentos fallidos los siguientes se demoran o bloquean
- [x] 6.5 Implementar la página de inicio de sesión con mensaje de error que no distingue entre usuario y contraseña incorrectos, y verificar que el mensaje es idéntico en ambos casos

## 7. Panel de administración

- [ ] 7.1 Implementar la selección de casa y la vista de su galería con miniaturas, indicando cuál es la portada, y verificar que refleja el manifest incluido el caso de galería vacía
- [ ] 7.2 Implementar el endpoint de subida multiparte con los topes de tamaño por archivo y de cantidad por lote, y verificar con tests que un archivo excedido y un archivo no imagen se rechazan individualmente sin abortar el lote
- [ ] 7.3 Implementar la interfaz de subida con selección múltiple desde galería o cámara, indicador de avance y resumen final que separa las fotos cargadas de las fallidas con su motivo, y verificar subiendo un lote mixto desde un iPhone
- [ ] 7.4 Implementar la designación de portada desde el panel y verificar que el sitio público la refleja en la siguiente carga sin redesplegar
- [ ] 7.5 Implementar el reordenamiento mediante botones discretos de mover hacia adelante y hacia atrás, y verificar que el nuevo orden persiste y se refleja en el sitio público
- [ ] 7.6 Implementar la eliminación con confirmación explícita, que borra el original y todas las variantes, y verificar con un test que tras eliminar no quedan archivos de esa imagen en disco ni referencias en el manifest
- [ ] 7.7 Implementar la edición del texto alternativo por imagen y verificar que el sitio público publica el texto cargado y usa el de reserva cuando está vacío

## 8. Accesibilidad y verificación en dispositivo

- [ ] 8.1 Revisar el sitio público completo con el tamaño de texto del sistema en su ajuste máximo en un iPhone real y verificar que ningún texto queda recortado ni superpuesto y que todas las llamadas a la acción siguen pulsables
- [ ] 8.2 Recorrer el flujo completo del panel (iniciar sesión, subir un lote, designar portada, reordenar, eliminar, cerrar sesión) en un iPhone real con el texto en su ajuste máximo y verificar que se completa sin controles recortados ni inaccesibles
- [ ] 8.3 Verificar que todos los objetivos táctiles miden al menos 44 por 44 píxeles CSS y que ningún control depende de un ícono sin etiqueta de texto
- [ ] 8.4 Verificar el sitio al 200 por ciento de zoom del navegador y a 320 píxeles de ancho, comprobando que no hay pérdida de contenido ni desplazamiento horizontal del cuerpo
- [ ] 8.5 Pasar una auditoría automatizada de accesibilidad sobre el inicio, una página de casa y el panel, y verificar que no quedan incumplimientos de contraste, etiquetado de controles ni orden de encabezados

## 9. Empaquetado y operación

- [ ] 9.1 Escribir el `Dockerfile` con build en varias etapas sobre una base estándar de Node, y verificar que la imagen construye y que el contenedor sirve el sitio con `/data` vacío
- [ ] 9.2 Escribir el `docker-compose.yml` con el servicio de aplicación, el reverse proxy sirviendo `/images/` desde el volumen, el volumen nombrado en `/data` y el límite de memoria del servicio de aplicación, y verificar que `docker compose up` levanta el sitio y que una imagen subida se sirve a través del proxy
- [ ] 9.3 Configurar el montaje de `/data` como directorio local en desarrollo y verificar que los archivos generados por una subida son inspeccionables desde el host
- [ ] 9.4 Implementar el comando de mantenimiento que lista los archivos huérfanos y el espacio ocupado, con borrado sólo bajo confirmación explícita, y verificar con un test que detecta un huérfano y que no elimina nada sin confirmación
- [ ] 9.5 Verificar la persistencia reiniciando y redesplegando el contenedor sobre el mismo volumen, comprobando que las fotos, la portada y el orden se conservan
- [ ] 9.6 Verificar la restauración copiando `/data` a una instalación limpia y comprobando que el sitio muestra el mismo contenido que al momento de la copia
- [ ] 9.7 Escribir el `README` con las instrucciones de desarrollo, las variables de entorno, cómo generar el hash de la contraseña, cómo respaldar y cómo restaurar, y verificar siguiéndolo desde cero en un entorno limpio
