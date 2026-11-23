const themeButton = document.querySelector('.theme-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let dark;
function applyTheme() {
  const chosen = document.documentElement.dataset.theme;
  dark = chosen ? chosen === 'dark' : systemTheme.matches;
  themeButton.setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#000000' : '#f5f2ea';
}
themeButton.addEventListener('click', () => {
  const theme = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('portfolio-theme', theme); } catch {}
  applyTheme();
});
systemTheme.addEventListener('change', applyTheme);
applyTheme();
themeButton.hidden = false;

const menu = document.querySelector('.menu-toggle');
const options = document.querySelector('.header-options');
const main = document.querySelector('main');
const skip = document.querySelector('.skip');
let astrolabeLoad;
function ensureAstrolabe() {
  if (!astrolabeLoad) {
    astrolabeLoad = import('./astrolabe.js').catch(() => { astrolabeLoad = null; });
  }
}
function setMenu(open) {
  if (open) ensureAstrolabe();
  menu.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('menu-open', open);
  main.inert = open;
  skip.inert = open;
  document.dispatchEvent(new CustomEvent('portfolio:menu', { detail: { open } }));
}
function closeMenu() {
  if (menu.getAttribute('aria-expanded') === 'true') setMenu(false);
}
menu.addEventListener('pointerdown', ensureAstrolabe, { passive: true, once: true });
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('click', event => {
  if (menu.contains(event.target)) return;
  if (!options.contains(event.target) || event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
document.querySelector('.masthead').addEventListener('focusout', event => {
  if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
});
window.addEventListener('pageshow', closeMenu);
matchMedia('(max-width: 760px)').addEventListener('change', closeMenu);

// Enlaces internos (#inicio, #proyectos, #enlaces) sin escribir el #ancla en la dirección:
// así, al recargar, el navegador vuelve a donde estabas en vez de saltar siempre a esa sección.
// Un enlace con #ancla que llegue desde fuera sigue funcionando como siempre.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.classList.contains('skip') || event.defaultPrevented) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const id = link.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  closeMenu();
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  requestAnimationFrame(() => {
    // Sin «behavior»: respeta el scroll suave del CSS y, con «reducir movimiento», salta sin animar.
    if (target === document.body) window.scrollTo({ top: 0 });
    else target.scrollIntoView({ block: 'start' });
    // Como hace un enlace normal: el foco pasa a la sección, para que el tabulador siga desde ahí.
    if (target !== document.body) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
});

// Safari en iOS solo aplica :active si la página escucha toques; así funciona la respuesta al pulsar botones y tarjetas.
document.addEventListener('touchstart', () => {}, { passive: true });
