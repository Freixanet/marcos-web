import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from './build.mjs';

const profile = { nombre: 'Marcos', apellido: 'Freixanet', intro: 'Mi portfolio' };
const project = { titulo: 'Mi proyecto', descripcion: 'Un ejemplo', categoria: 'Test' };
const shortcut = { titulo: 'Contacto', descripcion: 'Escríbeme' };

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
