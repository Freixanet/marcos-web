import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from './build.mjs';

const profile = { nombre: 'Marcos', apellido: 'Freixanet', intro: 'Mi portfolio' };
const project = { titulo: 'Mi proyecto', descripcion: 'Un ejemplo', categoria: 'Test' };
const shortcut = { titulo: 'Contacto', descripcion: 'Escríbeme' };

test('contact links appear in the header, hero and footer', () => {
  const html = render({ ...profile, contacto: ' mailto:marcos@example.com ' });
  const contactLink = /href="mailto:marcos@example\.com"/g;
  assert.equal((html.match(contactLink) ?? []).length, 3);
  assert.match(html, /<nav[\s\S]*?href="mailto:marcos@example\.com">Escríbeme/);
  assert.match(html, /class="primary-action" href="mailto:marcos@example\.com">Escríbeme/);
  assert.match(html, /class="primary-action secondary-action" href="#proyectos"/);
  assert.match(html, /<footer[\s\S]*?Escríbeme: marcos@example\.com/);
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
  assert.doesNotMatch(html, /href=""|href="#"|href="https?:/);
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
  assert.match(html, /<h3>&lt;Primero&gt;<\/h3>/);
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(html, /href="mailto:marcos@example\.com"/);
});

test('unsafe schemes fail the build', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello']) {
    assert.throws(() => render({ ...profile, enlaces: [{ ...shortcut, url }] }), /Usa una URL/);
  }
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
  assert.match(html, /property="og:url" content="https:\/\/example.com\/portfolio\/"/);
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
