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

const projectArt = [
  '<g transform="rotate(-7 160 60)"><rect x="125" y="15" width="58" height="88" rx="8" fill="#fff8e9"/><path d="M142 22h24m-17 74h10"/><rect x="132" y="33" width="44" height="49" rx="3"/><path d="m141 57 9 9 17-20"/></g><path d="m201 80 10-50 6 2-10 50-5 8-1-10Zm10-50 1-5a3 3 0 0 1 6 2l-1 5M105 99h120M106 36l-5-5m2 15h-8m18-19v-7"/>',
  '<path d="M149 81c-1-12-18-16-18-34a29 29 0 0 1 58 0c0 18-17 22-18 34Z" fill="#fff8e9"/><path d="M148 87h24m-22 6h20m-15 6h10m-11-19V58l-10-8m22 30V58l10-8m-22 8h12M160 9V2m-41 18-7-6m-2 32h-10m20 26-8 5m89-57 7-6m2 32h10m-20 26 8 5"/>',
  '<path d="M160 38c-17-13-38-14-61-11l4 65c20-3 40-1 57 10 17-11 37-13 57-10l4-65c-23-3-44-2-61 11Z" fill="#fff8e9"/><path d="M160 38v64m-49-58c13-1 25 2 36 7m-35 7c12-1 23 2 35 7m-34 7c12 0 23 3 34 7m27-28c10-5 20-7 33-7m-33 21c10-5 20-7 32-7m-32 21c11-4 20-6 31-7m-75-56 8-10m22 14V6m23 11 8-10"/>',
];

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
      <svg viewBox="0 0 320 120" fill="none" stroke="currentColor" stroke-width="1.3">${projectArt[i % projectArt.length]}</svg>`;
  return `<li class="project-card">
    <div class="project-art art-${i % projectArt.length}" aria-hidden="true">
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
    ? `<a class="shortcut" href="${href}">${label}${arrow()}</a>`
    : `<div class="shortcut">${label}<span class="shortcut-status">Sin enlace aún</span></div>`
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
  <meta name="theme-color" content="#faf3e7">
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
  <link rel="preload" href="./fonts/geist-latin-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="./fonts/ibm-plex-sans-latin-variable.woff2" as="font" type="font/woff2" crossorigin>
  ${styles ? `<style>${styles}</style>` : '<link rel="stylesheet" href="./styles.css">'}
</head>
<body id="inicio">
  <a class="skip" href="#contenido">Saltar al contenido</a>
  <header class="masthead">
    <div class="shell masthead-inner">
      <a class="brand mono" href="#inicio" aria-label="${initials}. ${fullName}, inicio">${initials}<span>.</span></a>
      <nav aria-label="Principal">
        <a href="#proyectos">Proyectos</a>
        <a href="#enlaces">Enlaces</a>${contactHref ? `
        <a class="nav-contact" href="${contactHref}">Escríbeme ${arrow()}</a>` : ''}
      </nav>
    </div>
  </header>
  <main id="contenido">
    <section class="shell hero" aria-labelledby="nombre">
      <div class="hero-copy">
        <p class="mono kicker"><span class="signal" aria-hidden="true"></span> Portfolio personal</p>
        <h1 id="nombre">${escape(nombre)}<br>${escape(apellido)}<span>.</span></h1>
        ${rol ? `<p class="hero-role">${escape(rol)}</p>\n        ` : ''}<p class="hero-intro">${escape(intro)}</p>
        ${contactHref ? `<div class="hero-actions"><a class="primary-action" href="${contactHref}">Escríbeme ${arrow()}</a>
        <a class="primary-action secondary-action" href="#proyectos">Ver proyectos ${arrow('down')}</a></div>` : `<a class="primary-action" href="#proyectos">Ver proyectos ${arrow('down')}</a>`}
      </div>
      <figure class="hero-art" aria-hidden="true">
        <img src="./estudio.svg" width="420" height="342" alt="">
      </figure>
    </section>
    <section class="shell work" id="proyectos" aria-labelledby="proyectos-titulo">
      <div class="section-head">
        <div>
          <p class="mono kicker"><span>01 /</span> Lo que hago</p>
          <h2 id="proyectos-titulo">Proyectos</h2>
        </div>
        <p>${proyectos.length ? 'Un espacio para trabajos, ideas y experimentos.' : 'Todavía no hay proyectos publicados.'}</p>
      </div>
      ${proyectos.length ? `<ul class="project-grid" role="list">${proyectos.map((project, i) => projectCard(project, i, projectImages)).join('')}</ul>` : ''}
    </section>
    <section class="shelf" id="enlaces" aria-labelledby="enlaces-titulo">
      <div class="shell shelf-inner">
        <div>
          <p class="mono kicker"><span>02 /</span> Accesos directos</p>
          <h2 id="enlaces-titulo">A mano<span>.</span></h2>
          <p>Los enlaces y recursos que quiero encontrar sin dar vueltas.</p>
        </div>
        ${enlaces.length ? `<ul class="shortcut-list" role="list">${enlaces.map(shortcut).join('')}</ul>` : '<p>Todavía no hay enlaces publicados.</p>'}
      </div>
    </section>
  </main>
  <footer class="shell footer">
    <p class="mono">${fullName} <span aria-hidden="true">/</span> Portfolio personal</p>
    ${contactHref ? `<a href="${contactHref}">Escríbeme: ${escape(contacto.trim().replace(/^mailto:/i, '').split('?')[0])}</a>\n    ` : ''}<a href="#inicio">Volver arriba ${arrow('up')}</a>
  </footer>
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
