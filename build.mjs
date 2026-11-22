import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value = '') => value.replace(/[&<>"']/g, char => entities[char]);
const index = (i) => String(i + 1).padStart(2, '0');

function destination(url = '') {
  const value = url.trim();
  if (!value) return '';
  const parsed = new URL(value);
  if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
    throw new Error('Usa una URL con https:, http: o mailto:.');
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
  '<rect x="114" y="14" width="92" height="92" rx="15" transform="rotate(45 160 60)"/><rect x="129" y="29" width="62" height="62" rx="9" transform="rotate(45 160 60)"/><rect x="144" y="44" width="32" height="32" rx="4" transform="rotate(45 160 60)"/><circle cx="160" cy="60" r="3" fill="currentColor"/>',
  '<ellipse cx="160" cy="60" rx="65" ry="32" transform="rotate(-26 160 60)"/><ellipse cx="160" cy="60" rx="65" ry="32" transform="rotate(26 160 60)"/><ellipse cx="160" cy="60" rx="28" ry="51"/><circle cx="160" cy="60" r="5" fill="currentColor"/>',
  '<path d="M104 96V72h28V48h28V24h56M104 107V83h28V59h28V35h56M104 85V61h28V37h28V13h56"/><circle cx="207" cy="82" r="13"/><path d="M207 64v36m-18-18h36"/>',
];

function projectCard({ titulo, descripcion, categoria, url }, i) {
  const href = destination(url);
  return `<li class="project-card">
    <div class="project-art art-${i % projectArt.length}" aria-hidden="true">
      <span>${index(i)} /</span>
      <svg viewBox="0 0 320 120" fill="none" stroke="currentColor" stroke-width="1.3">${projectArt[i % projectArt.length]}</svg>
    </div>
    <div class="project-content">
      <p class="mono category">${escape(categoria)}</p>
      <h3>${escape(titulo)}</h3>
      <p>${escape(descripcion)}</p>
      ${href ? `<a class="project-link" href="${href}">Ver proyecto<span class="sr-only">: ${escape(titulo)}</span> ${arrow()}</a>` : '<span class="project-status">Sin enlace aún</span>'}
    </div>
  </li>`;
}

function shortcut({ titulo, descripcion, url }) {
  const href = destination(url);
  const label = `<span class="shortcut-label"><strong>${escape(titulo)}</strong><span>${escape(descripcion)}</span></span>`;
  return `<li>${href
    ? `<a class="shortcut" href="${href}">${label}${arrow()}</a>`
    : `<div class="shortcut">${label}<span class="shortcut-status">Sin enlace aún</span></div>`
  }</li>`;
}

export function render({ nombre, apellido, intro, rol, contacto, proyectos = [], enlaces = [] }) {
  const fullName = escape(`${nombre} ${apellido}`);
  const initials = escape(nombre.charAt(0) + apellido.charAt(0));
  const contactHref = destination(contacto);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(rol || intro)}">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#f5f2ea">
  <title>${fullName} — Portfolio personal</title>
  <link rel="icon" href="./icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="./icon-192.png">
  <link rel="manifest" href="./site.webmanifest" crossorigin="use-credentials">
  <link rel="stylesheet" href="./styles.css">
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
      ${proyectos.length ? `<ul class="project-grid" role="list">${proyectos.map(projectCard).join('')}</ul>` : ''}
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
  const data = JSON.parse(await readFile(new URL('contenido.json', root), 'utf8'));
  const page = render(data);
  await mkdir(output, { recursive: true });
  await cp(new URL('site/', root), output, { recursive: true });
  await writeFile(new URL('index.html', output), page);
}
