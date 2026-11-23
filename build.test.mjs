import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { render } from './build.mjs';

const profile = { nombre: 'Marcos', apellido: 'Freixanet', intro: 'Mi portfolio' };
const project = { titulo: 'Mi proyecto', descripcion: 'Un ejemplo', categoria: 'Test' };
const shortcut = { titulo: 'Contacto', descripcion: 'Escríbeme' };

test('contact links appear in the header and hero without a footer', () => {
  const html = render({ ...profile, contacto: ' mailto:marcos@example.com ' });
  const contactLink = /href="mailto:marcos@example\.com"/g;
  assert.equal((html.match(contactLink) ?? []).length, 2);
  assert.match(html, /<nav[\s\S]*?href="mailto:marcos@example\.com">Escríbeme/);
  assert.match(html, /class="primary-action" href="mailto:marcos@example\.com">Escríbeme/);
  assert.match(html, /class="primary-action secondary-action" href="#proyectos"/);
  assert.doesNotMatch(html, /<footer|Volver arriba/);
});

test('missing or empty contact preserves the original actions', () => {
  for (const contacto of [undefined, '', '  ']) {
    const html = render({ ...profile, contacto });
    assert.doesNotMatch(html, /Escríbeme|mailto:|secondary-action|hero-actions|nav-contact/);
    assert.match(html, /class="primary-action" href="#proyectos">Ver proyectos/);
  }
});

test('invalid contact destinations fail the build', () => {
  for (const contacto of ['javascript:alert(1)', 'not a URL']) {
    assert.throws(() => render({ ...profile, contacto }));
  }
});

test('role is escaped and used in the hero and meta description when present', () => {
  const html = render({ ...profile, rol: 'Swift & Python <apps>' });
  assert.match(html, /<p class="hero-role">Swift &amp; Python &lt;apps&gt;<\/p>/);
  assert.match(html, /<meta name="description" content="Swift &amp; Python &lt;apps&gt;">/);
  for (const rol of [undefined, '']) {
    const fallback = render({ ...profile, rol });
    assert.doesNotMatch(fallback, /hero-role/);
    assert.match(fallback, /<meta name="description" content="Mi portfolio">/);
  }
});

test('items with missing URLs never publish broken placeholder links', () => {
  const html = render({
    ...profile,
    proyectos: [project],
    enlaces: [{ ...shortcut, url: '  ' }],
  });
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>Marcos Freixanet — Portfolio personal<\/title>/);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${target}"`), `Missing destination: #${target}`);
  }
  assert.doesNotMatch(html.slice(html.indexOf('<body')), /href=""|href="#"|href="https?:/);
  assert.equal((html.match(/Sin enlace aún/g) ?? []).length, 2);
});

test('configured links work, and editable content is escaped', () => {
  const html = render({
    ...profile,
    intro: 'A & B "en portada"',
    proyectos: [{ ...project, titulo: '<Primero>', url: 'https://example.com/?a=1&b=2' }],
    enlaces: [{ ...shortcut, url: 'mailto:marcos@example.com' }],
  });
  assert.match(html, /A &amp; B &quot;en portada&quot;/);
  assert.match(html, /<a class="project-card" href="[^"]+" aria-labelledby="project-title-0">[\s\S]*?<h3 id="project-title-0">&lt;Primero&gt; <span class="project-category">\( Test \)<\/span><\/h3>[\s\S]*?<\/a>/);
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(html, /href="mailto:marcos@example\.com"/);
});

test('unsafe schemes fail the build', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello']) {
    assert.throws(() => render({ ...profile, enlaces: [{ ...shortcut, url }] }), /contenido\.json → enlaces\[0\]\.url: usa una URL/);
  }
});

test('invalid entries identify the exact field to edit', () => {
  for (const url of ['grafana.com', null]) {
    assert.throws(
      () => render({ ...profile, proyectos: [project, { ...project, url }] }),
      /contenido\.json → proyectos\[1\]\.url: usa una URL/,
    );
  }
  assert.throws(
    () => render({ ...profile, enlaces: [shortcut, { url: 'https://example.com' }] }),
    /contenido\.json → enlaces\[1\]\.titulo: escribe un texto no vacío/,
  );
});

test('minimal entries only render their titles and link state', () => {
  const html = render({ ...profile, proyectos: [{ titulo: 'Mapa' }], enlaces: [{ titulo: 'Notas' }] });
  assert.match(html, /<h3>Mapa<\/h3>/);
  assert.match(html, /<strong>Notas<\/strong><\/span>/);
  assert.doesNotMatch(html, /class="mono category"|<p><\/p>/);
});

test('the build copies existing covers and illustrates cards with no cover', async t => {
  const root = await mkdtemp(join(tmpdir(), 'marcos-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filename = 'Portada móvil.svg';
  const cover = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>';
  await mkdir(join(root, 'site', 'proyectos'), { recursive: true });
  for (const file of ['build.mjs', 'site.config.mjs', 'site/styles.css', 'site/hero.js', 'site/laminar.css', 'site/laminar.js']) {
    await copyFile(new URL(file, import.meta.url), join(root, file));
  }
  await writeFile(join(root, 'site', 'proyectos', filename), cover);
  await writeFile(join(root, 'contenido.json'), JSON.stringify({
    ...profile,
    proyectos: [{ ...project, imagen: filename }, project, { ...project, imagen: 'no-existe.webp' }],
  }));

  execFileSync(process.execPath, [join(root, 'build.mjs')]);

  const html = await readFile(join(root, 'dist', 'index.html'), 'utf8');
  assert.match(html, /<img src="\.\/proyectos\/Portada%20m%C3%B3vil\.svg" alt="" loading="lazy"/);
  assert.doesNotMatch(html, /no-existe.webp/);
  assert.equal((html.match(/<svg viewBox="0 0 320 120"/g) ?? []).length, 2);
  assert.equal(await readFile(join(root, 'dist', 'proyectos', filename), 'utf8'), cover);
  assert.equal(
    await readFile(join(root, 'dist', 'hero.js'), 'utf8'),
    await readFile(new URL('site/hero.js', import.meta.url), 'utf8'),
  );
});

test('empty sections still have navigation targets', () => {
  const html = render(profile);
  assert.match(html, /id="proyectos"/);
  assert.match(html, /Todavía no hay proyectos publicados/);
  assert.match(html, /id="enlaces"/);
  assert.match(html, /Todavía no hay enlaces publicados/);
  assert.doesNotMatch(html, /<ul/);
});

test('sharing metadata uses Spanish text and an absolute configured image URL', () => {
  const html = render({ ...profile, intro: 'Ideas & proyectos' }, { url: 'https://example.com/portfolio?draft=1#top' });
  assert.match(html, /property="og:title" content="Marcos Freixanet — Portfolio personal"/);
  assert.match(html, /property="og:description" content="Ideas &amp; proyectos"/);
  assert.match(html, /property="og:image" content="https:\/\/example.com\/portfolio\/og-image.jpg"/);
  assert.match(html, /property="og:url" content="https:\/\/example.com\/portfolio\/es\/"/);
  assert.match(html, /hreflang="x-default" href="https:\/\/example.com\/portfolio\/"/);
  assert.match(html, /property="og:type" content="website"/);
  assert.match(html, /property="og:locale" content="es_ES"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test('sharing metadata remains available with empty content and sections', () => {
  const html = render({ ...profile, intro: '' });
  assert.match(html, /property="og:description" content=""/);
  assert.match(html, /property="og:image" content="https?:\/\//);
});

test('invalid sharing URLs fail the build', () => {
  for (const url of ['', '/relative', 'javascript:alert(1)', 'https://user:password@example.com']) {
    assert.throws(() => render(profile, { url }));
  }
});

test('build can inline the small stylesheet without a blocking CSS request', () => {
  const html = render(profile, { styles: 'body { margin: 0; }' });
  assert.match(html, /<style>body \{ margin: 0; \}<\/style>/);
  assert.doesNotMatch(html, /rel="stylesheet"/);
  assert.match(render(profile, { styles: '' }), /rel="stylesheet"/);
});

test('each language gets its own page, interface text and switcher', () => {
  const data = {
    ...profile,
    intro: { es: 'Hola', ca: 'Hola, sóc', en: 'Hi there' },
    proyectos: [{ titulo: { es: 'Mapa', en: 'Map' } }],
  };
  const es = render(data);
  const ca = render(data, { lang: 'ca', url: 'https://example.com/' });
  const en = render(data, { lang: 'en', url: 'https://example.com/' });
  assert.match(es, /<html lang="es">/);
  assert.match(es, /class="hero-intro">Hola</);
  assert.match(es, /<a href="\.\.\/es\/" hreflang="es" lang="es" title="Español" aria-current="page">ES<\/a>/);
  assert.match(es, /<a href="\.\.\/" hreflang="en"/);
  assert.match(ca, /<html lang="ca">/);
  assert.match(ca, /class="hero-intro">Hola, sóc</);
  assert.match(ca, /<h3>Mapa<\/h3>/, 'missing translations fall back to Spanish');
  assert.match(ca, /Encara sense enllaç/);
  assert.match(ca, /href="\.\.\/icon\.svg"/);
  assert.match(ca, /property="og:url" content="https:\/\/example.com\/ca\/"/);
  assert.match(en, /<h3>Map<\/h3>/);
  assert.match(en, /<h2 id="proyectos-titulo">Projects<\/h2>/);
  assert.match(en, /<a href="\.\/es\/" hreflang="es"/);
  assert.match(en, /href="\.\/icon\.svg"/);
  assert.match(en, /property="og:url" content="https:\/\/example.com\/"/);
  assert.match(en, /hreflang="en" lang="en" title="English" aria-current="page"/);
  assert.match(en, /property="og:locale" content="en_GB"/);
  assert.throws(() => render(data, { lang: 'fr' }));
});

test('each hero has a single heading and a decorative laminar field', () => {
  for (const lang of ['es', 'ca', 'en']) {
    const html = render(profile, { lang });
    assert.match(html, /<canvas class="laminar-field" aria-hidden="true"><\/canvas>/);
    assert.match(html, /<script type="module" src="[^"]*hero\.js"/);
    assert.match(html, /<script type="module" src="[^"]*laminar\.js"/);
    assert.equal((html.match(/<h1 /g) ?? []).length, 1);
    assert.doesNotMatch(html, /hero-motion-toggle/);
  }
});
