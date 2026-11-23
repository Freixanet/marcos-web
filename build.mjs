import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { siteUrl } from './site.config.mjs';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value = '') => value.replace(/[&<>"']/g, char => entities[char]);

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

const projectArt = [
  '<rect x="114" y="14" width="92" height="92" rx="15" transform="rotate(45 160 60)"/><rect x="129" y="29" width="62" height="62" rx="9" transform="rotate(45 160 60)"/><rect x="144" y="44" width="32" height="32" rx="4" transform="rotate(45 160 60)"/><circle cx="160" cy="60" r="3" fill="currentColor"/>',
  '<ellipse cx="160" cy="60" rx="65" ry="32" transform="rotate(-26 160 60)"/><ellipse cx="160" cy="60" rx="65" ry="32" transform="rotate(26 160 60)"/><ellipse cx="160" cy="60" rx="28" ry="51"/><circle cx="160" cy="60" r="5" fill="currentColor"/>',
  '<path d="M104 96V72h28V48h28V24h56M104 107V83h28V59h28V35h56M104 85V61h28V37h28V13h56"/><circle cx="207" cy="82" r="13"/><path d="M207 64v36m-18-18h36"/>',
];

export const languages = ['en', 'es', 'ca'];
// Idioma de la raíz del sitio (dist/index.html); los demás van en su carpeta (dist/es/, dist/ca/).
export const defaultLang = 'en';

const ui = {
  es: {
    name: 'Español', locale: 'es_ES', skip: 'Saltar al contenido', mainNav: 'Principal', langNav: 'Idioma',
    projects: 'Proyectos', links: 'Enlaces', contact: 'Escríbeme', hero: 'Presentación', seeProjects: 'Ver proyectos',
    workKicker: 'Hecho y publicado', workIntro: 'Productos reales, publicados y en uso.', noProjects: 'Todavía no hay proyectos publicados.',
    shelfKicker: 'Tira del hilo', shelfTitle: 'En abierto', shelfIntro: 'Código público, herramientas y las notas detrás de cada producto.', noLinks: 'Todavía no hay enlaces publicados.',
    portfolio: 'Portfolio personal',
    imageAlt: name => `Portfolio personal de ${name}: productos publicados, código y enlaces.`,
  },
  ca: {
    name: 'Català', locale: 'ca_ES', skip: 'Salta al contingut', mainNav: 'Principal', langNav: 'Idioma',
    projects: 'Projectes', links: 'Enllaços', contact: 'Escriu-me', hero: 'Presentació', seeProjects: 'Veure projectes',
    workKicker: 'Fet i publicat', workIntro: 'Productes reals, publicats i en ús.', noProjects: 'Encara no hi ha projectes publicats.',
    shelfKicker: 'Estira el fil', shelfTitle: 'En obert', shelfIntro: 'Codi públic, eines reals i les notes darrere cada producte en marxa.', noLinks: 'Encara no hi ha enllaços publicats.',
    portfolio: 'Portfoli personal',
    imageAlt: name => `Portfoli personal de ${name}: productes publicats, codi i enllaços.`,
  },
  en: {
    name: 'English', locale: 'en_GB', skip: 'Skip to content', mainNav: 'Main', langNav: 'Language',
    projects: 'Projects', links: 'Links', contact: 'Get in touch', hero: 'Introduction', seeProjects: 'See projects',
    workKicker: 'Built & shipped', workIntro: 'Real products, shipped and in use.', noProjects: 'No projects published yet.',
    shelfKicker: 'Keep digging', shelfTitle: 'In the open', shelfIntro: 'Public code, working tools and the notes behind each live product.', noLinks: 'No links published yet.',
    portfolio: 'Personal portfolio',
    imageAlt: name => `Personal portfolio of ${name}: live products, code and direct links.`,
  },
};

const isTranslation = value => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length > 0 && Object.keys(value).every(key => languages.includes(key));

// Any text in contenido.json can be a plain string or { "es": "...", "ca": "...", "en": "..." }.
// Missing languages fall back to Spanish.
export function localize(value, lang) {
  if (Array.isArray(value)) return value.map(item => localize(item, lang));
  if (isTranslation(value)) return value[lang] ?? value.es ?? Object.values(value)[0];
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item, lang)]));
  }
  return value;
}

function projectCard({ titulo, descripcion, categoria, url, imagen, logo }, i, projectImages, t, base) {
  const field = `proyectos[${i}]`;
  const title = entryText(titulo, `${field}.titulo`, true);
  const description = entryText(descripcion, `${field}.descripcion`);
  const category = entryText(categoria, `${field}.categoria`);
  const href = destination(url, `${field}.url`);
  const hasLogo = typeof logo === 'string' && projectImages.has(logo.trim());
  const filename = hasLogo ? logo.trim() : typeof imagen === 'string' ? imagen.trim() : '';
  const cover = projectImages.has(filename)
    ? `<img src="${base}proyectos/${escape(encodeURIComponent(filename))}" alt="" loading="lazy" decoding="async" fetchpriority="low">`
    : `<svg viewBox="0 0 320 120" fill="none" stroke="currentColor" stroke-width="1.3">${projectArt[i % projectArt.length]}</svg>`;
  return `<li>
    ${href ? `<a class="project-card" href="${href}" aria-labelledby="project-title-${i}">` : '<div class="project-card">'}
    <div class="project-art art-${i % projectArt.length}${hasLogo ? ' project-logo' : ''}" aria-hidden="true">
      ${cover}
    </div>
    <div class="project-content">
      <h3${href ? ` id="project-title-${i}"` : ''}>${title}${category ? ` <span class="project-category">( ${category} )</span>` : ''}</h3>
      ${description ? `<p>${description}</p>` : ''}
    </div>
    ${href ? '</a>' : '</div>'}
  </li>`;
}

function shortcut({ titulo, descripcion, url }, i, t) {
  const field = `enlaces[${i}]`;
  const title = entryText(titulo, `${field}.titulo`, true);
  const description = entryText(descripcion, `${field}.descripcion`);
  const href = destination(url, `${field}.url`);
  const label = `<span class="shortcut-label"><strong>${title}</strong>${description ? `<span>${description}</span>` : ''}</span>`;
  return `<li>${href
    ? `<a class="shortcut" href="${href}">${label}</a>`
    : `<div class="shortcut">${label}</div>`
  }</li>`;
}

const langPath = lang => (lang === defaultLang ? '' : `${lang}/`);

export function render(data, { url = siteUrl, styles, projectImages = new Set(), lang = 'es' } = {}) {
  if (!languages.includes(lang)) throw new Error(`Idioma desconocido: ${lang}`);
  const { nombre, apellido, intro, rol, contacto, proyectos = [], enlaces = [] } = localize(data, lang);
  const t = ui[lang];
  const base = lang === defaultLang ? './' : '../';
  const fullName = escape(`${nombre} ${apellido}`);
  const contactHref = destination(contacto, 'contacto');
  const siteRoot = new URL(url);
  if (!['https:', 'http:'].includes(siteRoot.protocol) || siteRoot.username || siteRoot.password) {
    throw new Error('SITE_URL debe ser una URL pública con https: o http:.');
  }
  siteRoot.hash = '';
  siteRoot.search = '';
  if (!siteRoot.pathname.endsWith('/')) siteRoot.pathname += '/';
  const pageUrl = new URL(langPath(lang), siteRoot);
  const imageUrl = new URL('og-image.jpg', siteRoot);
  const alternates = languages.map(code => `<link rel="alternate" hreflang="${code}" href="${escape(new URL(langPath(code), siteRoot).href)}">`).join('\n  ');
  const switcher = languages.map(code => `<a href="${base}${langPath(code)}" hreflang="${code}" lang="${code}" title="${ui[code].name}"${code === lang ? ' aria-current="page"' : ''}>${code.toUpperCase()}</a>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(rol || intro)}">
  <meta name="robots" content="noindex">
  <script>
    try {
      const theme = localStorage.getItem('portfolio-theme');
      if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    } catch {}
  </script>
  <meta name="theme-color" content="#f5f2ea">
  <title>${fullName} — ${t.portfolio}</title>
  <link rel="canonical" href="${escape(pageUrl.href)}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${escape(siteRoot.href)}">
  <meta property="og:title" content="${fullName} — ${t.portfolio}">
  <meta property="og:description" content="${escape(intro)}">
  <meta property="og:image" content="${escape(imageUrl.href)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${t.imageAlt(fullName)}">
  <meta property="og:url" content="${escape(pageUrl.href)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${t.locale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${fullName} — ${t.portfolio}">
  <meta name="twitter:description" content="${escape(intro)}">
  <meta name="twitter:image" content="${escape(imageUrl.href)}">
  <link rel="icon" href="${base}icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${base}icon-192.png">
  <link rel="manifest" href="${base}site.webmanifest" crossorigin="use-credentials">
  <link rel="preload" href="${base}fonts/geist-latin-variable.woff2" as="font" type="font/woff2" crossorigin fetchpriority="high">
  <link rel="preload" href="${base}fonts/ibm-plex-sans-latin-variable.woff2" as="font" type="font/woff2" crossorigin fetchpriority="high">
  <link rel="modulepreload" href="${base}laminar.js">
  <link rel="modulepreload" href="${base}hero.js">
  ${styles ? `<style>${styles.replaceAll('url("./', `url("${base}`)}</style>` : `<link rel="stylesheet" href="${base}styles.css"><link rel="stylesheet" href="${base}laminar.css">`}
</head>
<body id="inicio">
  <a class="skip" href="#contenido">${t.skip}</a>
  <header class="masthead">
    <div class="shell masthead-inner">
      <a class="brand" href="#inicio">${fullName}<span aria-hidden="true">.</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="header-options" aria-label="${({es:'Menú',ca:'Menú',en:'Menu'})[lang]}"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><line class="bar-top" x1="3" y1="7" x2="17" y2="7"/><line class="bar-bottom" x1="3" y1="13" x2="17" y2="13"/></svg></button>
      <div class="header-options" id="header-options">
        <nav class="main-nav" aria-label="${t.mainNav}">
          <a href="#proyectos">${t.projects}</a>
          <a href="#enlaces">${t.links}</a>${contactHref ? `
          <a class="nav-contact" href="${contactHref}">${t.contact}</a>` : ''}
        </nav>
        <div class="menu-astrolabe" aria-hidden="true"><canvas></canvas></div>
        <nav class="lang-switch" aria-label="${t.langNav}">${switcher}</nav>
        <button class="theme-toggle" type="button" hidden aria-pressed="false" aria-label="${({es:'Modo oscuro', ca:'Mode fosc', en:'Dark mode'})[lang]}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path class="moon" d="M20.5 14.2A8.8 8.8 0 0 1 9.8 3.5a8.8 8.8 0 1 0 10.7 10.7Z"/>
          <g class="sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></g>
        </svg></button>
      </div>
    </div>
  </header>
  <main id="contenido">
    <section class="hero" aria-label="${t.hero}">
      <canvas class="laminar-field" aria-hidden="true"></canvas>
      <div class="shell hero-inner">
        <div class="hero-copy">
          <h1 class="sr-only">${fullName}</h1>
          ${rol ? `<p class="hero-role">${escape(rol)}</p>\n          ` : ''}<p class="hero-intro">${escape(intro)}</p>
          ${contactHref ? `<div class="hero-actions"><a class="primary-action" href="${contactHref}">${t.contact}</a>
          <a class="primary-action secondary-action" href="#proyectos">${t.seeProjects}</a></div>` : `<a class="primary-action" href="#proyectos">${t.seeProjects}</a>`}
        </div>
      </div>
    </section>
    <section class="shell work" id="proyectos" aria-labelledby="proyectos-titulo">
      <div class="section-head">
        <div>
          <p class="mono kicker">${t.workKicker}</p>
          <h2 id="proyectos-titulo">${t.projects}</h2>
        </div>
        <p>${proyectos.length ? t.workIntro : t.noProjects}</p>
      </div>
      ${proyectos.length ? `<ul class="project-grid" role="list">${proyectos.map((project, i) => projectCard(project, i, projectImages, t, base)).join('')}</ul>` : ''}
    </section>
    <section class="shelf" id="enlaces" aria-labelledby="enlaces-titulo">
      <div class="shell shelf-inner">
        <div>
          <p class="mono kicker">${t.shelfKicker}</p>
          <h2 id="enlaces-titulo">${t.shelfTitle}<span>.</span></h2>
          <p>${t.shelfIntro}</p>
        </div>
        ${enlaces.length ? `<ul class="shortcut-list" role="list">${enlaces.map((item, i) => shortcut(item, i, t)).join('')}</ul>` : `<p>${t.noLinks}</p>`}
      </div>
    </section>
  </main>
  <script type="module" src="${base}hero.js"></script>
  <script type="module" src="${base}laminar.js"></script>
</body>
</html>
`;
}

const minifyCss = css => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};,])\s*/g, '$1')
  .replace(/:\s+/g, ':')
  .replace(/\(\s+/g, '(')
  .replace(/\s+\)/g, ')')
  .replace(/;}/g, '}')
  .trim();

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
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
  const styles = minifyCss((await Promise.all(['styles.css', 'laminar.css'].map(file => readFile(new URL(file, source), 'utf8')))).join('\n'));
  const files = await readdir(new URL('proyectos/', source), { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const projectImages = new Set(files.filter(file => file.isFile() && coverExtensions.test(file.name)).map(file => file.name));
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });
  for (const lang of languages) {
    const folder = new URL(langPath(lang), output);
    await mkdir(folder, { recursive: true });
    await writeFile(new URL('index.html', folder), render(data, { styles, projectImages, lang }));
  }
}
