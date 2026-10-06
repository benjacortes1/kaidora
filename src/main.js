/* ===================================================================== main.js
   Arranque: preferencias, filtros guardados, pestañas de página, rutas y atajos. */

function boot() {
  document.documentElement.lang = 'es';
  // al recargar se empieza arriba (pantalla de carga y kit cerrado): si el navegador restaurase el scroll a mitad de la portada,
  // la entrada del kit se mezclaría con la animación de scroll y el kit quedaría encendido detrás de las tarjetas
  // (con la API de ScrollTrigger: guarda el valor y lo repone en cada refresco; si se asigna a mano, lo devuelve a «auto»)
  if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.clearScrollMemory('manual'); }
  initA11y();
  watchZoomButtons();
  const saved = store('filters');
  if (saved && typeof saved === 'object' && PERIODS.some((p) => p.id === saved.period)) {
    S.f.period = saved.period;
    ['ch', 'li', 're'].forEach((k) => { if (Number.isInteger(saved[k])) S.f[k] = saved[k]; });
  }
  $('#drawer-close').addEventListener('click', () => Drawer.close());
  $('#drawer-scrim').addEventListener('click', () => Drawer.close());
  $('#focus-close').addEventListener('click', () => Focus.close());
  $('#focus-scrim').addEventListener('click', () => Focus.close());
  $$('#focus-seg button').forEach((b) => b.addEventListener('click', () => Focus.mode(b.dataset.mode)));
  addEventListener('scroll', () => Tip.hide(), { passive: true });
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS[v] && v !== S.view) go(v); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (Listen.playing) { Listen.stop(); return; }
      if (Focus.isOpen()) { Focus.close(); return; }
      if (Ficha.isOpen()) { const b = Ficha.btn; Ficha.close(); if (b) b.focus(); return; }
      if (Drawer.isOpen()) { Drawer.close(); return; }
      if (!$('#a11y').hidden) { toggleA11y(false); return; }
    }
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
    const map = { 0: 'home', 1: 'tps', 2: 'mis', 3: 'dss', 4: 'ess' };
    if (map[e.key]) { e.preventDefault(); go(map[e.key]); }
  });
  Intro.play();
  const start = location.hash.slice(1);
  go(VIEWS[start] ? start : 'home', { noFocus: true });
  S.booted = true;
  addEventListener('resize', () => Ficha.close());
}
// solo para las pruebas de rendimiento (kaidora/perf): con ?perfdebug en la dirección se puede leer el estado del kit
if (/[?&]perfdebug\b/.test(location.search)) window.__kaidora = { KitSeq, Intro, KIT_WIN };
// build.py ejecuta este mismo código en Node para escribir en el HTML la portada móvil (se ve sin esperar al JavaScript)
if (typeof KAIDORA_PRERENDER === 'function') { const html = homeMobileHtml(); KAIDORA_PRERENDER({ html, hash: strHash(html) }); return; }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
