# Marcos Freixanet · Portfolio

Portfolio personal en español, con una sección de proyectos y otra para guardar enlaces útiles. Es un sitio estático: no necesita base de datos ni dependencias de npm.

## Añadir proyectos y enlaces

Edita [`contenido.json`](contenido.json). Sustituye los ejemplos por tus proyectos y enlaces, o bórralos si aún no los necesitas.

| Sección | Campos |
| --- | --- |
| Presentación | `nombre`, `apellido`, `intro` |
| Rol (opcional) | `rol`: línea destacada en portada y descripción para buscadores |
| Contacto (opcional) | `contacto`: URL `mailto:` para los enlaces «Escríbeme» en cabecera, portada y pie |
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

## Vista previa al compartir

[`site.config.mjs`](site.config.mjs) define la URL pública de respaldo (la vista previa de Devin). Para otro dominio, ejecuta `SITE_URL=https://tu-dominio.es npm run build`. Se utiliza para `og:url` y las imágenes absolutas de Open Graph y Twitter. El alojamiento debe permitir el acceso público a la página y a `og-image.jpg` para que los rastreadores puedan leerlos; una vista previa con inicio de sesión no genera tarjetas públicas.

La tarjeta está en [`site/og-image.jpg`](site/og-image.jpg) (1200 × 630). El build incorpora la hoja CSS pequeña al HTML para evitar una petición bloqueante; no carga JavaScript ni fuentes externas.
