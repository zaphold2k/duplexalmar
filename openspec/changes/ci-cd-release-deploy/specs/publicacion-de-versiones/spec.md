## Purpose

Define cómo se verifica cada cambio del sitio, cómo se impide que un cambio empeore la calidad verificada, cómo se numera cada versión, cómo cada versión se publica como imagen de contenedor, y cómo una versión estable se convierte en una release con su changelog.

## ADDED Requirements

### Requirement: Verificación continua de cada cambio

El sistema SHALL ejecutar, en cada push a `main` o a una rama de trabajo y en cada pull request, la verificación completa del proyecto (lint, typecheck, tests unitarios y build) y la suite de navegador contra la imagen de contenedor construida desde ese mismo commit. El resultado SHALL quedar visible en el commit y en el pull request, nombrando todas las etapas que fallaron y no sólo la primera. Ninguna publicación de imagen ni de release SHALL ocurrir si esa verificación no está en verde para el commit publicado.

#### Scenario: Cambio correcto

- **WHEN** se empuja un commit cuya verificación completa y suite de navegador pasan
- **THEN** el commit queda marcado como verificado en GitHub

#### Scenario: Cambio con lint o test roto

- **WHEN** se empuja un commit en el que falla el lint, el typecheck, un test unitario, el build o un test de navegador
- **THEN** el commit queda marcado como fallido, el resumen del flujo nombra cada etapa que falló, y no se publica ninguna imagen ni release a partir de él

#### Scenario: La imagen no arranca

- **WHEN** la imagen construida desde el commit no llega a responder en la raíz del sitio con la configuración mínima
- **THEN** la verificación falla y la imagen no se publica

### Requirement: Un cambio no empeora la calidad verificada

El sistema SHALL medir en cada corrida la cobertura, la cantidad de tests que pasan, la cantidad de tests salteados y la cantidad de supresiones de lint o de tipos, y SHALL comparar esas métricas contra la última corrida verde de la rama a la que el cambio se integra. El sistema SHALL bloquear el cambio cuando la cobertura baje, cuando bajen los tests que pasan, o cuando suban los tests salteados o las supresiones. Cuando no haya una medición previa contra la que comparar, el sistema SHALL informar las métricas y no bloquear. La excepción SHALL requerir una acción explícita y atribuida sobre el pull request, nunca un valor de configuración ni un texto en un mensaje de commit.

#### Scenario: Cambio que baja la cobertura

- **WHEN** se abre un pull request cuyo código nuevo no está cubierto y la cobertura queda por debajo de la de la última corrida verde de `main`
- **THEN** la verificación falla indicando qué métrica retrocedió y contra qué valor se comparó

#### Scenario: Test salteado en vez de arreglado

- **WHEN** un cambio marca como salteado un test que antes corría
- **THEN** la verificación falla, aunque la cobertura no haya bajado

#### Scenario: Supresión de lint agregada

- **WHEN** un cambio agrega una supresión de una regla de lint o de un error de tipos
- **THEN** la verificación falla indicando que subieron las supresiones

#### Scenario: Primera corrida sin línea de base

- **WHEN** corre la verificación sin que exista una corrida verde previa de la rama de integración
- **THEN** las métricas quedan informadas en el resumen y la verificación no bloquea por ese motivo

#### Scenario: Regresión aparente aceptada a mano

- **WHEN** una persona decide que la regresión medida es una mejora deliberada y aplica la excepción sobre el pull request
- **THEN** la comparación sigue reportándose, la excepción queda registrada en el historial del pull request y el cambio no se bloquea

### Requirement: La versión sale del tag, calculada desde los commits

La versión del sitio SHALL ser el tag de git con la forma `v<versión>`, y SHALL calcularse a partir de los prefijos convencionales de los commits acumulados desde la última versión estable: sólo correcciones producen un aumento de parche, al menos una funcionalidad produce un aumento menor, y una ruptura mientras la serie sea `0.x` produce también un aumento menor. Los archivos del proyecto que registran la versión (`package.json`, `CHANGELOG.md`) SHALL ser mantenidos por el sistema como registro, y NO SHALL editarse a mano para cortar una versión.

#### Scenario: Sólo correcciones desde la última versión

- **WHEN** desde la última versión estable sólo hay commits `fix:`
- **THEN** la versión propuesta aumenta el parche

#### Scenario: Alguna funcionalidad desde la última versión

- **WHEN** desde la última versión estable hay al menos un commit `feat:`
- **THEN** la versión propuesta aumenta la versión menor

#### Scenario: Commits que no cambian la versión

- **WHEN** desde la última versión estable sólo hay commits de documentación, refactor, tests o tareas
- **THEN** el sistema no propone ninguna versión nueva

### Requirement: Una imagen publicada por cada versión

Por cada versión publicada, el sistema SHALL construir la imagen de contenedor del sitio desde el commit correspondiente y subirla al registro público `ghcr.io/zaphold2k/duplexalmar` con la etiqueta de esa versión. La imagen SHALL estar disponible para las plataformas `linux/amd64` y `linux/arm64` bajo la misma etiqueta. La imagen SHALL declarar las etiquetas OCI de origen, versión y revisión (commit) para que el registro la enlace al repositorio y sea posible saber qué commit contiene. La versión efectiva de una imagen SHALL ser la etiqueta por la que se la referencia; nada del sistema SHALL depender de la versión grabada dentro del manifiesto.

#### Scenario: Imagen para ambas plataformas

- **WHEN** se publica la versión `0.2.0`
- **THEN** `docker pull ghcr.io/zaphold2k/duplexalmar:0.2.0` funciona tanto en una máquina `amd64` como en una `arm64` y obtiene la variante correcta

#### Scenario: Imagen enlazada al commit

- **WHEN** se inspecciona una imagen publicada
- **THEN** sus etiquetas OCI indican el repositorio de origen, la versión y el commit exacto desde el que se construyó

#### Scenario: Imagen accesible sin credenciales

- **WHEN** alguien sin sesión en el registro baja una versión publicada
- **THEN** la descarga funciona, porque el paquete es público

### Requirement: Pre-releases automáticas desde cada rama de trabajo

Por cada push a una rama de trabajo del repositorio, el sistema SHALL crear un tag de pre-release que identifique la rama y el orden de la pre-release dentro de ella, y SHALL publicar su imagen en la misma ejecución que crea el tag, más una etiqueta móvil de imagen con el nombre de la rama. La versión base de la pre-release SHALL ser la versión que se liberaría si esos cambios se integraran. Una pre-release NO SHALL modificar la etiqueta `latest` ni las etiquetas de versión estable del registro. Un push a una rama que no tenga rol en el modelo de ramas del repositorio SHALL verificarse sin publicar nada.

#### Scenario: Push a una rama de trabajo

- **WHEN** se empuja un commit `feat:` a la rama `feature/sitio-inicial` con la verificación en verde y la última versión estable en `0.1.0`
- **THEN** queda creado el tag de pre-release `v0.2.0-alpha.sitio-inicial.1`, publicada su imagen y actualizada la etiqueta móvil `sitio-inicial` apuntando a ella

#### Scenario: Segundo push a la misma rama

- **WHEN** se empuja otro commit a la misma rama
- **THEN** la pre-release siguiente conserva la versión base y aumenta su número de orden, y la etiqueta móvil de la rama pasa a apuntar a la imagen nueva

#### Scenario: Una pre-release no toca latest

- **WHEN** se publica una pre-release
- **THEN** la etiqueta `latest` del registro sigue apuntando a la última versión estable publicada

#### Scenario: Rama sin rol en el modelo

- **WHEN** se empuja una rama cuyo nombre no es el de la rama principal ni corresponde al patrón de las ramas de trabajo
- **THEN** la verificación corre igual y no se crea ningún tag ni imagen

### Requirement: Release al aceptar la propuesta de versión

El sistema SHALL mantener abierta, contra la rama principal, una propuesta de release con la versión calculada y el changelog de esa versión. Al aceptarse esa propuesta, el sistema SHALL crear el tag estable, dejar en la rama principal el changelog y la versión registrada, crear en GitHub la release asociada al tag con el changelog como cuerpo, y publicar la imagen de esa versión con las etiquetas de versión completa, de versión menor y `latest`. El changelog SHALL agrupar los cambios por tipo según el prefijo convencional de cada commit y SHALL estar redactado en español. Mientras la serie sea `0.x`, el sistema NO SHALL publicar una etiqueta de major pelado. Un push a la rama principal que no sea la aceptación de una propuesta NO SHALL producir ninguna versión.

#### Scenario: Propuesta de release aceptada

- **WHEN** se acepta la propuesta de release de la versión `0.2.0`
- **THEN** existe el tag `v0.2.0`, la rama principal tiene el changelog de `0.2.0` y la versión registrada, la release `v0.2.0` muestra las funcionalidades y correcciones agrupadas por tipo, y quedan publicadas las imágenes `0.2.0`, `0.2` y `latest`

#### Scenario: Serie 0.x sin etiqueta de major

- **WHEN** se publica una versión de la serie `0.x`
- **THEN** no existe una etiqueta de imagen con el major pelado, porque mezclaría versiones potencialmente incompatibles

#### Scenario: Push a la rama principal sin release

- **WHEN** llega a la rama principal un cambio de documentación que no acepta ninguna propuesta de release
- **THEN** la verificación corre, no se crea ninguna versión ni release, y la única imagen publicada es la de la rama principal y la del commit

#### Scenario: Fallo al publicar la imagen de una release

- **WHEN** la construcción o la subida de la imagen falla durante una release
- **THEN** la release queda sin imagen publicada y volver a ejecutar el flujo sobre ese tag la completa, sin necesidad de cortar una versión nueva

### Requirement: El flujo se reutiliza, no se reimplementa

El repositorio SHALL obtener su pipeline del componente reutilizable `zaphold2k/ci-workflows`, consumido por una referencia de versión mayor, y sus archivos de flujo propios SHALL limitarse a declarar los valores específicos de este repositorio. La lógica de verificación, comparación de calidad, construcción de imagen y versionado NO SHALL duplicarse en este repositorio.

#### Scenario: Lector de los archivos de flujo

- **WHEN** alguien abre los workflows de este repositorio
- **THEN** encuentra qué lenguaje, qué modelo de rama, qué patrón de ramas de trabajo, qué imagen y qué comandos se declaran, y la referencia al componente que los ejecuta, sin pasos de construcción ni de publicación escritos acá

#### Scenario: Mejora del pipeline

- **WHEN** el componente publica una mejora dentro de su misma versión mayor
- **THEN** este repositorio la recibe en su próxima corrida sin cambios en sus archivos

### Requirement: Documentación del flujo generada y verificada

El repositorio SHALL llevar, en el README y en sus instrucciones de agente, un bloque generado por el componente que describa el flujo concreto de este repositorio: de qué rama trabajar, qué produce cada push, cómo se corta una versión y que la comparación de calidad no se esquiva. El sistema SHALL verificar en cada corrida que ese bloque corresponde a la configuración declarada, y SHALL fallar cuando no corresponda. El repositorio SHALL documentar además, en español y por su cuenta, cómo se corta una versión, dónde se ve el changelog, qué hacer cuando una release queda sin imagen publicada, y que la excepción de la comparación de calidad es una decisión de una persona.

#### Scenario: Configuración cambiada sin regenerar

- **WHEN** se cambia el patrón de ramas de trabajo o el nombre de la imagen en el workflow y no se regenera el bloque
- **THEN** la verificación falla indicando que la documentación quedó desactualizada

#### Scenario: Persona nueva corta una versión

- **WHEN** alguien lee el README para publicar una versión
- **THEN** sabe que empujar su rama produce una pre-release y que aceptar la propuesta de release publica la versión estable, sin tener que abrir ningún archivo de flujo
