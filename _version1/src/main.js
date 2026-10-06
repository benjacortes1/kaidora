/* ===================================================================== main.js
   Arranque: preferencias, filtros, navegación, atajos de teclado y simulación. */

function boot() {
  document.documentElement.lang = 'es';
  initA11y();
  initFilters();
  const liveSaved = store('live');
  if (liveSaved === false) S.live = false;

  $('#menu-btn').addEventListener('click', () => ($('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar()));
  $('#side-scrim').addEventListener('click', closeSidebar);
  $('#drawer-close').addEventListener('click', () => Drawer.close());
  $('#drawer-scrim').addEventListener('click', () => Drawer.close());
  addEventListener('scroll', () => Tip.hide(), { passive: true });

  addEventListener('hashchange', () => {
    const v = location.hash.slice(1);
    if (VIEWS[v] && v !== S.view) go(v);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (Tour.active()) { Tour.end(); return; }
      if (Drawer.isOpen()) { Drawer.close(); return; }
      if (!$('#a11y').hidden) { toggleA11y(false); return; }
      if ($('#sidebar').classList.contains('open')) { closeSidebar(); return; }
    }
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag) || e.target.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
    const map = { 0: 'home', 1: 'tps', 2: 'mis', 3: 'dss', 4: 'ess' };
    if (map[e.key]) { e.preventDefault(); go(map[e.key]); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); Tour.active() ? Tour.end() : Tour.start(0); }
    else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); toggleA11y(); }
  });

  const start = location.hash.slice(1);
  go(VIEWS[start] ? start : 'home', { noFocus: true });
  setLive(S.live);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
