# Marcos Freixanet · Portfolio

Portfolio personal en español, con una sección de proyectos y otra para guardar enlaces útiles. Es un sitio estático: no necesita base de datos ni dependencias de npm.

## Añadir proyectos y enlaces

Edita [`contenido.json`](contenido.json). Sustituye los ejemplos por tus proyectos y enlaces, o bórralos si aún no los necesitas.

| Sección | Campos |
| --- | --- |
| Presentación | `nombre`, `apellido`, `intro` |
| `proyectos` | `titulo`, `descripcion`, `categoria`, `url` |
| `enlaces` | `titulo`, `descripcion`, `url` |

En `url`, usa una dirección completa como `https://ejemplo.com` o `mailto:tu@ejemplo.com`. Si la dejas en blanco, la tarjeta se muestra sin enlace. Puedes dejar una sección sin elementos con `[]`.

## Probar y publicar

Con Node.js 22 o posterior y Python 3:

```sh
npm test
npm run build
npm start
```

Abre <http://localhost:4173>. Después de editar el contenido, vuelve a ejecutar `npm run build` y recarga la página.

El resultado está en `dist/`. Puedes publicarlo tal cual en un alojamiento estático. Esta versión incluye `noindex` en el HTML generado para que los buscadores no indexen los ejemplos; quítalo en [`build.mjs`](build.mjs) cuando publiques contenido real. `noindex` no restringe el acceso.
