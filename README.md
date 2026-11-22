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

`rol` aparece destacado en la portada y en la descripción para buscadores. Para mostrar «Escríbeme» en la cabecera, la portada y el pie, usa una dirección `mailto:` en `contacto`.

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

La tarjeta está en [`site/og-image.jpg`](site/og-image.jpg) (1200 × 630). El build incorpora la hoja CSS pequeña al HTML para evitar una petición bloqueante; no carga JavaScript ni fuentes externas.

## Tipografía

Este prototipo claro y colorido mantiene su tipografía de sistema, sin descargar fuentes. Los archivos WOFF2 de Geist, IBM Plex Sans y Martian Mono de la versión principal se conservan en `site/fonts/`, pero no se cargan en esta propuesta. Sus fuentes y licencias SIL Open Font License están documentadas en [`site/fonts/README.md`](site/fonts/README.md).
