import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { siteUrl } from './site.config.mjs';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value = '') => value.replace(/[&<>"']/g, char => entities[char]);
const index = (i) => String(i + 1).padStart(2, '0');

const coverExtensions = /\.(avif|jpe?g|png|svg|webp)$/i;

function entryText(value = '', field, required = false) {
  if (typeof value !== 'string' || (required && !value.trim())) {
    throw new Error(`contenido.json → ${field}: ${required ? 'escribe un texto no vacío' : 'usa un texto entre comillas'}.`);
  }
  return escape(value.trim());
}

function destination(url = '', field) {
  const message = `contenido.json → ${field}: usa una URL completa con https:, http: o mailto:, o deja "".`;
  if (typeof url !== 'string') throw new Error(message);
  const value = url.trim();
  if (!value) return '';
  if (!URL.canParse(value)) throw new Error(message);
  const parsed = new URL(value);
  if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
    throw new Error(message);
  }
  return escape(parsed.href);
}

const arrow = (direction = 'diagonal') => {
  const path = {
    diagonal: 'M4 12 12 4M5 4h7v7',
    down: 'M8 3v10m-4-4 4 4 4-4',
    up: 'M8 13V3m-4 4 4-4 4 4',
  }[direction];
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};

const pixelIcon = (kind = 'folder') => {
  const shapes = {
    folder: '<path fill="#fff5b0" d="M3 8h11l3 4h13v17H3z"/><path fill="#edc45e" d="M2 13h29v17H2z"/><path d="M3 8h11l3 4h13v18H2V13h28M4 15h24M5 28h22"/>',
    computer: '<path fill="#d2d2c7" d="M5 2h23v21H5zM13 23h7v4h-7zM3 27h28v4H3z"/><path fill="#003d50" d="M8 5h17v14H8z"/><path stroke="#75e6d7" d="m11 9 3 3-3 3m6 0h5"/><path d="M5 2h23v21H5zM3 27h28v4H3z"/>',
    globe: '<circle cx="16" cy="16" r="14" fill="#4283d1"/><path fill="#78be83" stroke="none" d="m8 5 7-2 3 5-5 5-7-1-3 7 5 5 2-6 6 2 1 9 6-3 1-8 6-2-2-7-6 2-3-7z"/><circle cx="16" cy="16" r="14"/><path d="M3 16h26M16 2c-9 8-9 20 0 28 9-8 9-20 0-28z"/>',
    document: '<path fill="#fffff6" d="M6 2h15l7 7v22H6z"/><path fill="#c2c2bb" d="M21 2v7h7"/><path d="M6 2h15l7 7v22H6zM21 2v7h7M10 14h13m-13 5h13m-13 5h9"/>',
  };
  return `<svg class="pixel-icon" viewBox="0 0 34 34" fill="none" stroke="#202b35" stroke-width="2" stroke-linejoin="miter" shape-rendering="crispEdges" aria-hidden="true">${shapes[kind] || shapes.folder}</svg>`;
};

const windowTitle = (title, icon = 'document') => `<div class="window-title" aria-hidden="true"><span>${pixelIcon(icon)}${title}</span><span class="window-marks"><i></i><i></i><i></i></span></div>`;

function projectCard({ titulo, descripcion, categoria, url, imagen }, i, projectImages) {
  const field = `proyectos[${i}]`;
  const title = entryText(titulo, `${field}.titulo`, true);
  const description = entryText(descripcion, `${field}.descripcion`);
  const category = entryText(categoria, `${field}.categoria`);
  const href = destination(url, `${field}.url`);
  const filename = typeof imagen === 'string' ? imagen.trim() : '';
  const cover = projectImages.has(filename)
    ? `<img src="./proyectos/${escape(encodeURIComponent(filename))}" alt="" loading="lazy" decoding="async">`
    : `<span>${index(i)} /</span>
      ${pixelIcon(['folder', 'globe', 'document'][i % 3])}`;
  return `<li class="project-card">
    <div class="project-art" aria-hidden="true">
      ${cover}
    </div>
    <div class="project-content">
      ${category ? `<p class="mono category">${category}</p>` : ''}
      <h3>${title}</h3>
      ${description ? `<p>${description}</p>` : ''}
      ${href ? `<a class="project-link" href="${href}">Ver proyecto<span class="sr-only">: ${title}</span> ${arrow()}</a>` : '<span class="project-status">Sin enlace aún</span>'}
    </div>
  </li>`;
}

function shortcut({ titulo, descripcion, url }, i) {
  const field = `enlaces[${i}]`;
  const title = entryText(titulo, `${field}.titulo`, true);
  const description = entryText(descripcion, `${field}.descripcion`);
  const href = destination(url, `${field}.url`);
  const label = `<span class="shortcut-label"><strong>${title}</strong>${description ? `<span>${description}</span>` : ''}</span>`;
  return `<li>${href
    ? `<a class="shortcut" href="${href}">${pixelIcon('globe')}${label}${arrow()}</a>`
    : `<div class="shortcut">${pixelIcon('folder')}${label}<span class="shortcut-status">Sin enlace aún</span></div>`
  }</li>`;
}

export function render({ nombre, apellido, intro, rol, contacto, proyectos = [], enlaces = [] }, { url = siteUrl, styles, projectImages = new Set() } = {}) {
  const fullName = escape(`${nombre} ${apellido}`);
  const initials = escape(nombre.charAt(0) + apellido.charAt(0));
  const contactHref = destination(contacto, 'contacto');
  const pageUrl = new URL(url);
  if (!['https:', 'http:'].includes(pageUrl.protocol) || pageUrl.username || pageUrl.password) {
    throw new Error('SITE_URL debe ser una URL pública con https: o http:.');
  }
  pageUrl.hash = '';
  pageUrl.search = '';
  if (!pageUrl.pathname.endsWith('/')) pageUrl.pathname += '/';
  const imageUrl = new URL('og-image.jpg', pageUrl);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(rol || intro)}">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#087f82">
  <title>${fullName} — Portfolio personal</title>
  <meta property="og:title" content="${fullName} — Portfolio personal">
  <meta property="og:description" content="${escape(intro)}">
  <meta property="og:image" content="${escape(imageUrl.href)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="Portfolio personal de ${fullName}: proyectos, ideas y enlaces.">
  <meta property="og:url" content="${escape(pageUrl.href)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_ES">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${fullName} — Portfolio personal">
  <meta name="twitter:description" content="${escape(intro)}">
  <meta name="twitter:image" content="${escape(imageUrl.href)}">
  <link rel="icon" href="./icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="./icon-192.png">
  <link rel="manifest" href="./site.webmanifest" crossorigin="use-credentials">
  ${styles ? `<style>${styles}</style>` : '<link rel="stylesheet" href="./styles.css">'}
</head>
<body id="inicio">
  <a class="skip" href="#contenido">Saltar al contenido</a>
  <header class="masthead">
    <div class="shell masthead-inner">
      <a class="brand mono" href="#inicio" aria-label="${initials}. ${fullName}, inicio">${pixelIcon('computer')}<span>${initials} / OS</span></a>
      <nav aria-label="Principal">
        <a href="#proyectos">Proyectos</a>
        <a href="#enlaces">Enlaces</a>${contactHref ? `
        <a class="nav-contact" href="${contactHref}">Escríbeme ${arrow()}</a>` : ''}
      </nav>
    </div>
  </header>
  <div class="desktop-label" aria-hidden="true"><span>ESCRITORIO PERSONAL</span><span>VOL. 01 — BARCELONA</span></div>
  <aside class="desktop-icons" aria-label="Accesos del escritorio">
    <a href="#contenido">${pixelIcon('computer')}<span>Mi espacio</span></a>
    <a href="#proyectos">${pixelIcon('folder')}<span>Proyectos</span></a>
    <a href="#enlaces">${pixelIcon('globe')}<span>Mis enlaces</span></a>
  </aside>
  <main id="contenido" class="desktop">
    <section class="shell hero window" aria-labelledby="nombre">
      ${windowTitle('sobre_mi.txt — Bloc de notas')}
      <div class="window-menu" aria-hidden="true">Archivo <span>Edición</span> <span>Ver</span></div>
      <div class="hero-body">
      <div class="hero-copy">
        <p class="mono kicker">Hola, soy</p>
        <h1 id="nombre">${escape(nombre)}<br>${escape(apellido)}<span>.</span></h1>
        ${rol ? `<p class="hero-role">${escape(rol)}</p>\n        ` : ''}<p class="hero-intro">${escape(intro)}</p>
        ${contactHref ? `<div class="hero-actions"><a class="primary-action" href="${contactHref}">Escríbeme ${arrow()}</a>
        <a class="primary-action secondary-action" href="#proyectos">Ver proyectos ${arrow('down')}</a></div>` : `<a class="primary-action" href="#proyectos">Ver proyectos ${arrow('down')}</a>`}
      </div>
      <figure class="hero-art" aria-hidden="true">
        <img src="./retro-computer.svg" width="240" height="250" alt="">
        <figcaption>Ideas dentro.<br>Productos fuera.</figcaption>
      </figure>
      </div>
      <div class="window-status"><span>Portfolio personal</span><span>Listo para crear.</span></div>
    </section>
    <section class="shell work window" id="proyectos" aria-labelledby="proyectos-titulo">
      ${windowTitle('C:\\Marcos\\Proyectos', 'folder')}
      <div class="explorer-address" aria-hidden="true"><span>Dirección</span><span>${pixelIcon('folder')} Mi espacio / Proyectos</span></div>
      <div class="section-head">
        <div>
          <p class="mono kicker"><span>01 /</span> Lo que hago</p>
          <h2 id="proyectos-titulo">Proyectos</h2>
        </div>
        <p>${proyectos.length ? 'Un espacio para trabajos, ideas y experimentos.' : 'Todavía no hay proyectos publicados.'}</p>
      </div>
      ${proyectos.length ? `<ul class="project-grid" role="list">${proyectos.map((project, i) => projectCard(project, i, projectImages)).join('')}</ul>` : ''}
      <div class="window-status"><span>${proyectos.length} objetos</span><span>Trabajos, ideas y experimentos</span></div>
    </section>
    <section class="shelf window" id="enlaces" aria-labelledby="enlaces-titulo">
      ${windowTitle('Favoritos', 'globe')}
      <div class="shell shelf-inner">
        <div>
          <p class="mono kicker"><span>02 /</span> Accesos directos</p>
          <h2 id="enlaces-titulo">A mano<span>.</span></h2>
          <p>Los enlaces y recursos que quiero encontrar sin dar vueltas.</p>
        </div>
        ${enlaces.length ? `<ul class="shortcut-list" role="list">${enlaces.map(shortcut).join('')}</ul>` : '<p>Todavía no hay enlaces publicados.</p>'}
      </div>
      <div class="window-status"><span>${enlaces.length} accesos directos</span></div>
      <div class="desktop-sticker" aria-hidden="true"><span>HECHO CON</span><strong>curiosidad<span>®</span></strong><span>Y UNAS CUANTAS IDEAS</span></div>
    </section>
  </main>
  <footer class="shell footer">
    <p class="mono">${fullName} <span aria-hidden="true">/</span> Portfolio personal</p>
    ${contactHref ? `<a href="${contactHref}">Escríbeme: ${escape(contacto.trim().replace(/^mailto:/i, '').split('?')[0])}</a>\n    ` : ''}<a href="#inicio">Volver arriba ${arrow('up')}</a>
  </footer>
  <div class="taskbar" aria-hidden="true"><span class="start-label">${pixelIcon('computer')} Inicio</span><span class="task-active">${pixelIcon('document')} Portfolio personal</span><span class="taskbar-status"><span></span> Barcelona</span></div>
</body>
</html>
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = new URL('./', import.meta.url);
  const output = new URL('dist/', root);
  const input = await readFile(new URL('contenido.json', root), 'utf8');
  let data;
  try {
    data = JSON.parse(input);
  } catch (error) {
    throw new Error(`contenido.json: ${error.message}`, { cause: error });
  }
  const source = new URL('site/', root);
  const styles = await readFile(new URL('styles.css', source), 'utf8');
  const files = await readdir(new URL('proyectos/', source), { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const projectImages = new Set(files.filter(file => file.isFile() && coverExtensions.test(file.name)).map(file => file.name));
  const page = render(data, { styles, projectImages });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });
  await writeFile(new URL('index.html', output), page);
}
