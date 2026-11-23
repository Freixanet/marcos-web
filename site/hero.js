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
function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('menu-open', open);
  main.inert = open;
  skip.inert = open;
}
function closeMenu() {
  if (menu.getAttribute('aria-expanded') === 'true') setMenu(false);
}
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
