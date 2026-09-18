## 1. Almacenamiento compartido y contenido original

- [ ] 1.1 Extraer la lectura con valor por defecto ante `ENOENT`, la escritura atómica (temporal + rename) y el mutex por ruta de `src/server/houses/manifest-store.ts` a `src/server/storage/json-file.ts`, dejar que `manifest-store` lo use, y verificar que los tests existentes de `manifest-store` siguen en verde sin modificarlos
- [ ] 1.2 Mover el párrafo de presentación de `src/pages/index.astro` a `src/content/home.ts` (`homeContent.intro`) y hacer que la página lo lea de ahí, y verificar con `npm run build` más el e2e de accesibilidad del inicio que la página se ve igual
- [ ] 1.3 Agregar a `src/content/houses.ts` una función que derive el texto original de capacidad a partir de los campos estructurados (las tres líneas que hoy se ven en la página), y verificar con un test que para la Casa Rosa produce "Hasta 5 personas", la línea de dormitorios/baños/plantas y la de camas, en ese orden

## 2. Módulo de textos editables

- [ ] 2.1 Crear `src/server/texts/sections.ts` con la declaración de ámbitos (`inicio`, `casa-rosa`, `casa-verde`) y de secciones por ámbito (nombre estable, tipo `paragraphs` | `list`, función que devuelve el original desde el contenido tipado), y verificar con un test que cada casa expone exactamente `description`, `capacity`, `highlights`, `services` y `rules`, el inicio exactamente `intro`, y que el original de cada lista es el arreglo unido por saltos de línea
- [ ] 2.2 Crear `src/server/texts/texts-store.ts` con el esquema zod del archivo `DATA_DIR/texts/<ámbito>.json` (`{ version: 1, sections: {…} }`), lectura que devuelve vacío sin archivo y lanza ante un archivo inválido, y escritura atómica sobre `json-file`, y verificar con tests (a) sin archivo devuelve vacío, (b) un archivo con JSON inválido lanza, (c) dos guardados concurrentes de secciones distintas quedan ambos persistidos
- [ ] 2.3 Implementar `getEffectiveTexts(dataDir, ámbito)` que devuelve para cada sección `{ text, customized }` con el editado si existe y el original si no, y verificar con tests que sin archivo todo es original y `customized: false`, y que con una sección guardada sólo esa cambia
- [ ] 2.4 Implementar `saveText(dataDir, ámbito, sección, texto)` y `resetText(dataDir, ámbito, sección)` con validación de ámbito y sección, límite de 5000 caracteres y rechazo del texto vacío tras partirlo, y verificar con tests que (a) un ámbito o sección inexistente se rechaza sin escribir, (b) un texto de 5001 caracteres se rechaza indicando el límite, (c) un texto sólo con espacios y saltos se rechaza, (d) `resetText` sobre una sección nunca editada no falla y deja el original, (e) guardar una sección no altera las demás
- [ ] 2.5 Implementar `splitParagraphs` y `splitLines` en `src/server/texts/render.ts`, y verificar con tests que dos bloques separados por línea en blanco dan dos párrafos, que las líneas vacías de una lista se descartan conservando el orden, y que ningún resultado contiene HTML generado (el texto entra y sale como cadenas)

## 3. Endpoints de administración

- [ ] 3.1 Implementar `POST /api/admin/[scope]/texts/save` (`FormData` con `section` y `text`) delegando en `saveText`, respondiendo 400 con el mensaje de validación en español, y verificar con un test de servidor que un guardado válido persiste el texto y uno con sección inexistente responde 400 sin escribir
- [ ] 3.2 Implementar `POST /api/admin/[scope]/texts/reset` (`FormData` con `section`) delegando en `resetText`, y verificar con un test que responde correctamente aunque la sección nunca se haya editado
- [ ] 3.3 Verificar con un test que ambos endpoints responden con estado de no autorizado ante una petición sin sesión válida y no modifican el disco (mismo guardia que el resto de `/api/admin/**`, sin cambios en `guard.ts`)

## 4. Sitio público

- [ ] 4.1 Modificar `src/pages/[slug].astro` para leer `getEffectiveTexts` y renderizar la descripción como párrafos y capacidad, lo que la distingue, servicios y para tener en cuenta como listas, con los títulos actuales sin cambios, y verificar con un e2e que sin textos editados la página muestra exactamente el mismo contenido que antes (mismos ítems de servicios, capacidad y reglas)
- [ ] 4.2 Modificar `src/pages/index.astro` para renderizar la presentación desde `getEffectiveTexts('inicio')` como párrafos, y verificar con un e2e que sin textos editados el inicio muestra el párrafo original
- [ ] 4.3 Verificar con un e2e que un texto guardado con una etiqueta HTML se muestra como caracteres literales en la página pública y no crea ningún elemento

## 5. Panel de administración

- [ ] 5.1 Crear el componente `src/components/admin/TextSectionEditor.astro` (título fijo, `<textarea>` precargado, "Guardar", "Volver al texto original" sólo si está editada, párrafo de estado con `role="status"`/`role="alert"`) con `field-sizing: content` y un `min-height` en `rem`, y verificar con el e2e de objetivos táctiles que todos sus controles miden al menos 44×44px y tienen nombre accesible
- [ ] 5.2 Agregar la sección "Textos" a `src/pages/admin/[house].astro` con un editor por sección, cableado a los endpoints: guardar con éxito recarga la página, un error muestra el mensaje y conserva el texto en el campo, y "volver al original" pide confirmación, y verificar con un e2e que editar los servicios de la Casa Rosa desde el panel los publica en `/casa-rosa` sin tocar la Casa Verde, y que volver al original restablece la lista
- [ ] 5.3 Agregar la sección "Presentación de inicio" a `src/pages/admin/index.astro` entre "Casas" y "Foto principal de inicio", y verificar con un e2e que editar la presentación la publica en `/` y que volver al original la restablece
- [ ] 5.4 Verificar con un e2e que, al intentar guardar un texto vacío, el panel muestra el mensaje de error, el campo conserva lo escrito y la página pública no cambia
- [ ] 5.5 Verificar con la auditoría de accesibilidad (axe) que el panel de casa y el principal no tienen incumplimientos nuevos con los campos agregados

## 6. Verificación final y documentación

- [ ] 6.1 Correr `npm run check` y `npm run test:e2e:docker` y confirmar que quedan en verde con todo lo agregado en esta change
- [ ] 6.2 Actualizar el README: la descripción del panel menciona los textos editables, y la sección de copia de seguridad menciona que `/data/texts/` viaja con el resto de `/data`
- [ ] 6.3 Verificar en un iPhone real, con el tamaño de texto del sistema al máximo y en modo oscuro, que los campos de texto muestran el contenido completo y los botones se pueden pulsar
