# Marcos Freixanet · Portfolio

Portfolio personal en español, con una sección de proyectos y otra para guardar enlaces útiles. Es un sitio estático: no necesita base de datos ni dependencias de npm.

## Añadir proyectos y enlaces

1. Abre [`contenido.json`](contenido.json). Para añadir un proyecto o un enlace, copia uno de los bloques `{ ... }` dentro de `proyectos` o `enlaces` y cambia sus valores.
2. Separa los bloques con comas, sin coma después del último. Usa comillas dobles para las claves y los textos. El orden en el archivo es el orden en la página; usa `[]` para dejar una lista vacía.
3. Ejecuta `npm run build` y recarga la página para revisar los cambios antes de publicar.

| Sección | Obligatorios | Opcionales |
| --- | --- | --- |
| Presentación | `nombre`, `apellido`, `intro` | `rol`, `contacto` |
| Cada proyecto | `titulo` | `descripcion`, `categoria`, `url`, `imagen` |
| Cada enlace | `titulo` | `descripcion`, `url` |

`rol` aparece destacado en la portada y en la descripción para buscadores. Para mostrar «Escríbeme» en la cabecera y la portada, usa una dirección `mailto:` en `contacto`.

En `url` usa una dirección completa con `https:`, `http:` o `mailto:`. Si aún no tienes un destino, omite `url` o escribe `""` para mostrar la ficha como texto.

Para añadir una portada, guarda la imagen en `site/proyectos/` (crea la carpeta si no existe) y pon solo el nombre exacto del archivo en `imagen`. Se admiten JPG, PNG, WebP, AVIF y SVG. Si omites `imagen` o el archivo no existe, se muestra una ilustración automática. La portada puede recortarse para encajar en la tarjeta; incluye los detalles importantes en `descripcion`.

Ejemplo de archivo completo; para añadir estas entradas sin borrar las tuyas, copia solo los bloques de cada lista:

```json
{
  "nombre": "Marcos",
  "apellido": "Freixanet",
  "intro": "Diseño y construyo productos, de la interfaz al servidor.",
  "proyectos": [
    {
      "titulo": "Bitácora de rutas para iPhone",
      "descripcion": "Guarda rutas y notas incluso sin conexión.",
      "categoria": "App iOS",
      "imagen": "bitacora.webp"
    }
  ],
  "enlaces": [
    { "titulo": "Documentación de Swift", "url": "https://www.swift.org/documentation/" }
  ]
}
```

Si la compilación indica `enlaces[0].url`, revisa la dirección del **primer** enlace: las posiciones empiezan en cero. Si el error apunta a la sintaxis de `contenido.json`, comprueba las comas y las comillas cerca de la posición indicada.

## Idiomas

La web se genera en inglés (`dist/index.html`, el idioma predeterminado), español (`dist/es/`) y catalán (`dist/ca/`). El selector de idioma está en el menú del móvil; en escritorio está oculto por ahora. El idioma de la raíz se cambia en `defaultLang`, dentro de [`build.mjs`](build.mjs). Cualquier texto de `contenido.json` puede ser un texto normal, igual en los tres idiomas, o un bloque con una versión por idioma:

```json
"intro": { "es": "Hola", "ca": "Hola", "en": "Hi" }
```

Si falta un idioma se usa el texto en español. Los textos fijos de la interfaz están en `ui`, dentro de [`build.mjs`](build.mjs).

## Probar y publicar

Con Node.js 22 o posterior y Python 3:

```sh
npm test
npm run build
npm start
```

Abre <http://localhost:4173>. Puedes dejar `npm start` en marcha y ejecutar `npm run build` en otra terminal después de cada edición.

El resultado está en `dist/`. Puedes publicarlo tal cual en un alojamiento estático. Esta versión incluye `noindex` en el HTML generado para que los buscadores no indexen los ejemplos; quítalo en [`build.mjs`](build.mjs) cuando publiques contenido real. `noindex` no restringe el acceso.

## Vista previa al compartir

[`site.config.mjs`](site.config.mjs) define la URL pública de respaldo (la vista previa de Devin). Para otro dominio, ejecuta `SITE_URL=https://tu-dominio.es npm run build`. Se utiliza para `og:url` y las imágenes absolutas de Open Graph y Twitter. El alojamiento debe permitir el acceso público a la página y a `og-image.jpg` para que los rastreadores puedan leerlos; una vista previa con inicio de sesión no genera tarjetas públicas.

La tarjeta está en [`site/og-image.jpg`](site/og-image.jpg) (1200 × 630). El build incorpora la hoja CSS pequeña al HTML para evitar una petición bloqueante y añade el módulo local sin dependencias [`site/hero.js`](site/hero.js) para la animación del hero; no carga JavaScript ni fuentes externas.

## Tipografía

La combinación está inspirada en desmodus.co: Geist para titulares, IBM Plex Sans para texto y Martian Mono para etiquetas. Las fuentes variables WOFF2 se sirven desde `site/fonts/`, sin peticiones a Google ni a Desmodus. Los subconjuntos latinos incluyen los acentos del español. Sus fuentes y licencias SIL Open Font License están documentadas en [`site/fonts/README.md`](site/fonts/README.md).

Como referencias de diseño se usan la jerarquía tipográfica de [Geist](https://vercel.com/geist/typography) y [Carbon](https://carbondesignsystem.com/guidelines/typography/overview/), las recomendaciones de [Material para texto legible](https://m3.material.io/styles/typography/applying-type) y la [simplicidad visual de NN/g](https://www.nngroup.com/articles/aesthetic-minimalist-design/). Las etiquetas parten de 12 px, los textos de lectura usan un interlineado de al menos 1,5 y los controles mantienen áreas de al menos 44 px de alto, foco visible y navegación por teclado, siguiendo las guías de [WCAG](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html). Son criterios aplicados al portfolio, no una certificación de accesibilidad.
