/* ===================================================================== core.js
   Datos, estado, agregación, formato, navegación, segmentadores y accesibilidad. */

const D = DATA;
const NM = D.months.length;          // ene-2022 .. sep-2026
const LAST = NM - 1;
const T = (mk) => D.months.indexOf(mk);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CH_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
const FIXED_COST = { 2022: 285000, 2023: 318000, 2024: 352000, 2025: 380000, 2026: 405000 };
const TARGET_2026 = 21000000;
const CUT = '30/09/2026';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mYear = (t) => +D.months[t].slice(0, 4);
const mMonth = (t) => +D.months[t].slice(5, 7);
function mLabel(t, style = 'short') {
  const y = mYear(t), m = mMonth(t);
  if (style === 'long') return `${MES_L[m - 1]} ${y}`;
  return `${MES[m - 1]} ${String(y).slice(2)}`;
}

/* ---------------------------------------------------------------- formato es-ES */
function group(n) { const neg = n < 0; const s = String(Math.round(Math.abs(n))); return (neg ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function dec(n, d = 1) { const neg = n < 0; const [i, f] = Math.abs(n).toFixed(d).split('.'); return (neg ? '−' : '') + group(+i) + (f ? ',' + f : ''); }
const fmtN = (n) => group(n);
function fmtEur(v, o = {}) {
  const a = Math.abs(v);
  if (!o.full && a >= 1e6) return dec(v / 1e6, 2) + ' M€';
  if (!o.full && a >= 1e4) return dec(v / 1e3, 0) + ' k€';
  if (o.cents) return dec(v, 2) + ' €';
  return group(v) + ' €';
}
const fmtPct = (v, d = 1) => dec(v * 100, d) + ' %';
const signPct = (v, d = 1) => (v > 0 ? '+' : '') + dec(v * 100, d) + ' %';
const fmtPP = (v, d = 1) => (v > 0 ? '+' : '') + dec(v * 100, d) + ' p. p.';
const eurAxis = (v) => (Math.abs(v) >= 1e6 ? dec(v / 1e6, 1) + ' M' : Math.abs(v) >= 1e3 ? dec(v / 1e3, 0) + ' k' : dec(v, 0));
function deltaHtml(v, { goodUp = true, suffix = '', pp = false, d = 1 } = {}) {
  if (v == null || !isFinite(v)) return '';
  const cls = Math.abs(v) < 0.0005 ? 'flat' : ((v > 0) === goodUp ? 'up' : 'down');
  return `<span class="delta ${cls}">${v > 0 ? '▲' : v < 0 ? '▼' : '■'} ${pp ? fmtPP(v, d) : signPct(v, d)}</span>${suffix ? `<span>${suffix}</span>` : ''}`;
}

/* ---------------------------------------------------------------- PRNG con semilla */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickW(r, w) { let x = r() * sum(w); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return w.length - 1; }
function lnorm(r, s) { const u = Math.max(1e-9, r()), v = r(); return Math.exp(s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); }

/* ---------------------------------------------------------------- iconos */
const IC = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  a11y: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5"/><path d="M12 10v5l-3 6M12 15l3 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  xcirc: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  excl: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v6M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  data: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5"/><path d="M4.5 12v6.3c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.5-6 7-6s6.2 2 7 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .3c0 1.7-2.5 2-2.5 3.7M12 16.8v.01"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
};
function icon(name) { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ''}</svg>`; }
function statusChip(level, text) {
  const ic = { good: 'check', warn: 'alert', serious: 'excl', crit: 'xcirc', info: 'info' }[level];
  return `<span class="status ${level}">${icon(ic)}${esc(text)}</span>`;
}

/* ---------------------------------------------------------------- índices */
const FACTS_BY_M = Array.from({ length: NM }, () => []);
D.facts.forEach((f) => FACTS_BY_M[f[0]].push(f));
const BUDGET = Array.from({ length: NM }, () => new Array(D.channels.length).fill(0));
D.budget.forEach((b) => { BUDGET[b[0]][b[1]] = b[2]; });

/* ---------------------------------------------------------------- estado */
const S = {
  view: 'home',
  f: { period: 'ytd', ch: -1, li: -1, re: -1 },
  dss: 'kit',
  animate: false,
  booted: false,
  prefs: { theme: 'light', contrast: 'normal', font: '1' },
};
const PERIODS = [
  { id: 'm', label: 'Sep 2026', months: [LAST] },
  { id: 'q', label: '3T 2026', months: range(LAST - 2, LAST) },
  { id: 'ytd', label: '2026 (ene⁠–⁠sep)', months: range(T('2026-01'), LAST) },   // ⁠: el texto no se parte por el guion
  { id: 'l12', label: 'Últimos 12 meses', months: range(LAST - 11, LAST) },
  { id: 'y25', label: '2025', months: range(T('2025-01'), T('2025-12')) },
  { id: 'y24', label: '2024', months: range(T('2024-01'), T('2024-12')) },
  { id: 'y23', label: '2023', months: range(T('2023-01'), T('2023-12')) },
  { id: 'y22', label: '2022', months: range(0, T('2022-12')) },
  { id: 'all', label: '2022–2026', months: range(0, LAST) },
];
const periodObj = (id = S.f.period) => PERIODS.find((p) => p.id === id) || PERIODS[2];
const prevMonths = (ms) => (ms.every((t) => t - 12 >= 0) ? ms.map((t) => t - 12) : null);
const matches = (f, flt) => (flt.ch < 0 || f[1] === flt.ch) && (flt.li < 0 || f[2] === flt.li) && (flt.re < 0 || f[3] === flt.re);
function emptyAgg() { return { rev: 0, units: 0, ret: 0, cogs: 0, ccost: 0, logi: 0, orders: 0 }; }
function addTo(o, f) {
  const ch = D.channels[f[1]], ln = D.lines[f[2]], y = mYear(f[0]);
  o.rev += f[5]; o.units += f[4]; o.ret += f[6];
  o.cogs += f[4] * ln.cost * D.cost_infl[y]; o.ccost += f[5] * ch.fee; o.logi += f[4] * ch.log;
  o.orders += f[4] / ch.upo;
}
/** Agrega ventas de los meses indicados con los filtros dados. */
/* los datos no cambian: cada agregación (meses + filtros) se calcula una vez y se recuerda; los resultados no se modifican fuera */
const AGG_MEMO = new Map();
function agg(months, flt = S.f) {
  const key = months.join(',') + '|' + flt.ch + ',' + flt.li + ',' + flt.re;
  const memo = AGG_MEMO.get(key); if (memo) return memo;
  if (AGG_MEMO.size > 400) AGG_MEMO.clear();
  const r = emptyAgg(); AGG_MEMO.set(key, r);
  r.byM = new Map(months.map((t) => [t, emptyAgg()]));
  r.byCh = D.channels.map(emptyAgg); r.byLi = D.lines.map(emptyAgg); r.byRe = D.regions.map(emptyAgg);
  for (const t of months) {
    for (const f of FACTS_BY_M[t]) {
      if (!matches(f, flt)) continue;
      addTo(r, f); addTo(r.byM.get(t), f); addTo(r.byCh[f[1]], f); addTo(r.byLi[f[2]], f); addTo(r.byRe[f[3]], f);
    }
  }
  r.contrib = r.rev - r.cogs - r.ccost - r.logi;
  return r;
}
const ALL = { ch: -1, li: -1, re: -1 };
function budgetFor(months, flt = S.f) {
  if (flt.li >= 0 || flt.re >= 0) return null;
  return sum(months, (t) => (flt.ch < 0 ? sum(BUDGET[t]) : BUDGET[t][flt.ch]));
}
function budgetByM(months, flt = S.f) {
  if (flt.li >= 0 || flt.re >= 0) return null;
  return months.map((t) => (flt.ch < 0 ? sum(BUDGET[t]) : BUDGET[t][flt.ch]));
}

/* ---------------------------------------------------------------- personas (indicadores del ESS) */
const EMP = D.employees;
const fte = (e) => e.salario / (e.jornada === 'Parcial' ? 0.75 : 1);
function payGap(list) {
  const w = list.filter((e) => e.genero === 'M'), h = list.filter((e) => e.genero === 'H');
  return 1 - mean(w.map(fte)) / mean(h.map(fte));
}
function adjustedGap() {
  const byRole = {}; let ws = 0, gs = 0;
  EMP.forEach((e) => { (byRole[e.puesto] = byRole[e.puesto] || []).push(e); });
  Object.values(byRole).forEach((l) => {
    const w = l.filter((e) => e.genero === 'M'), h = l.filter((e) => e.genero === 'H');
    if (w.length && h.length) { gs += (1 - mean(w.map(fte)) / mean(h.map(fte))) * l.length; ws += l.length; }
  });
  return ws ? gs / ws : 0;
}
const HR = {
  total: EMP.length,
  women: EMP.filter((e) => e.genero === 'M').length,
  leaders: EMP.filter((e) => e.nivel === 'dir' || e.nivel === 'mi'),
  disc: EMP.filter((e) => e.disc).length,
  gap: payGap(EMP), gapAdj: adjustedGap(),
  form55: mean(EMP.filter((e) => e.edad >= 55).map((e) => e.formacion)) / mean(EMP.map((e) => e.formacion)),
};
HR.leadersW = HR.leaders.filter((e) => e.genero === 'M').length;

/* ---------------------------------------------------------------- operaciones */
const oeeOf = (o) => o[2] * o[3] * o[4];
function oeeAvg(ms, n = -1) {
  const set = new Set(ms); let w = 0, s = 0;
  D.oee.forEach((o) => { if (set.has(o[0]) && (n < 0 || o[1] === n)) { s += oeeOf(o) * o[5]; w += o[5]; } });
  return w ? s / w : null;
}
const oeeSeries = (n) => D.months.map((_, t) => { const o = D.oee.find((x) => x[0] === t && x[1] === n); return o ? oeeOf(o) : null; });

/* ---------------------------------------------------------------- utilidades DOM */
function mount(id, html) { const el = document.getElementById(id); el.innerHTML = html; return el; }
function put(root, name, node) { const s = root.querySelector(`[data-slot="${name}"]`); if (s) s.replaceWith(node); node.dataset.area = name; return node; }
function frag(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

/* ---------------------------------------------------------------- tooltip */
const Tip = {
  el: null,
  show(x, y, node) {
    if (!this.el) this.el = document.getElementById('tip');
    this.el.replaceChildren(node); this.el.classList.add('show');
    const r = this.el.getBoundingClientRect();
    let l = x + 14, t = y + 14;
    if (l + r.width > innerWidth - 8) l = x - r.width - 14;
    if (t + r.height > innerHeight - 8) t = y - r.height - 14;
    this.el.style.left = Math.max(8, l) + 'px'; this.el.style.top = Math.max(8, t) + 'px';
  },
  hide() { if (this.el) this.el.classList.remove('show'); },
};
function tipNode(title, rows) {
  const box = document.createElement('div');
  const t = document.createElement('div'); t.className = 'tt'; t.textContent = title; box.appendChild(t);
  rows.forEach((r) => {
    const row = document.createElement('div'); row.className = 'tr';
    const name = document.createElement('span');
    if (r.color) { const k = document.createElement('i'); k.className = r.key === 'rect' ? 'swatch' : 'line-key'; k.style.background = r.color; name.appendChild(k); }
    name.appendChild(document.createTextNode(r.name));
    const v = document.createElement('b'); v.textContent = r.value;
    row.append(name, v); box.appendChild(row);
  });
  return box;
}

/* ---------------------------------------------------------------- panel de detalle (obtener detalles) */
const Drawer = {
  last: null,
  open({ title, path, body }) {
    this.last = document.activeElement;
    const d = $('#drawer');
    $('#drawer-title').textContent = title; $('#drawer-path').innerHTML = path || '';
    const b = $('#drawer-body'); b.replaceChildren(); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
    d.hidden = false; d.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => { d.classList.add('show'); $('#drawer-scrim').classList.add('show'); $('#drawer-close').focus(); });
  },
  close() {
    const d = $('#drawer'); if (!d.classList.contains('show')) return;
    d.classList.remove('show'); $('#drawer-scrim').classList.remove('show'); d.setAttribute('aria-hidden', 'true');
    setTimeout(() => { d.hidden = true; }, 240);
    if (this.last && this.last.focus) this.last.focus();
  },
  isOpen() { return $('#drawer').classList.contains('show'); },
};

/* ---------------------------------------------------------------- accesibilidad (menú compacto) */
function reducedMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('kaidora.' + k)); localStorage.setItem('kaidora.' + k, JSON.stringify(v)); } catch (e) { return null; } return null; }
function applyPrefs() {
  const p = S.prefs, root = document.documentElement;
  root.setAttribute('data-theme', p.theme === 'dark' ? 'dark' : 'light');
  if (p.contrast === 'more') root.setAttribute('data-contrast', 'more'); else root.removeAttribute('data-contrast');
  if (p.font === '1') root.removeAttribute('data-fontscale'); else root.setAttribute('data-fontscale', p.font);
  $$('#a11y [data-pref]').forEach((b) => b.setAttribute('aria-pressed', String(p[b.dataset.pref] === b.dataset.val)));
  store('prefs', p);
  if (S.booted) rerender();
}
function toggleA11y(force) {
  const pop = $('#a11y'), btn = $('#a11y-btn');
  const open = force === undefined ? pop.hidden : force;
  pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  if (open) { const f = pop.querySelector('button[aria-pressed="true"]') || pop.querySelector('button'); f && f.focus(); } else btn.focus();
}
function initA11y() {
  const saved = store('prefs');
  if (saved && typeof saved === 'object') Object.assign(S.prefs, saved);
  $('#a11y-btn').addEventListener('click', () => toggleA11y());
  $('#a11y-close').addEventListener('click', () => toggleA11y(false));
  $('#a11y').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pref]'); if (!b) return;
    S.prefs[b.dataset.pref] = b.dataset.val; applyPrefs();
  });
  applyPrefs();
}

/* ---------------------------------------------------------------- navegación */
const VIEWS = {
  home: { where: 'Inicio' },
  tps: { where: 'TPS · Procesamiento de transacciones' },
  mis: { where: 'MIS · Información gerencial' },
  dss: { where: 'DSS · Apoyo a la decisión' },
  ess: { where: 'ESS · Información para la dirección' },
};
const RENDER = {};
const LEAVE = {};     // limpieza al salir de una vista (p. ej. animaciones de la portada)
function go(view, opts = {}) {
  if (!VIEWS[view]) view = 'home';
  if (opts.filter) Object.assign(S.f, opts.filter);
  if (opts.dss) S.dss = opts.dss;
  const changed = S.view !== view, prev = S.view;
  if (typeof Focus !== 'undefined' && Focus.isOpen()) Focus.close(true);
  if (changed && LEAVE[prev]) LEAVE[prev]();
  S.view = view;
  document.body.setAttribute('data-view', view);
  $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + view; });
  // el panel que se deja se vacía: libera memoria y evita identificadores repetidos entre paneles (filtros, etiquetas)
  if (changed && prev) { const old = document.getElementById('view-' + prev); if (old) old.replaceChildren(); }
  $$('.pagetabs button, .topnav button').forEach((b) => { if (b.dataset.go === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#where').textContent = VIEWS[view].where;
  Tip.hide(); Ficha.close(); if (typeof Listen !== 'undefined') Listen.stop();
  S.animate = true;
  RENDER[view]();
  countUp($('#view-' + view));
  setTimeout(() => { S.animate = false; }, 80);
  try { if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view); } catch (e) { /* sin historial */ }
  if (changed) { window.scrollTo(0, 0); const h = $('#view-' + view + ' h1'); if (h && !opts.noFocus) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
}
function rerender() { Ficha.close(); RENDER[S.view](); }

/* ---------------------------------------------------------------- contador animado de los KPI */
function countUp(root) {
  if (!root || reducedMotion()) return;
  $$('[data-count]', root).forEach((el) => {
    const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue)); if (!node) return;
    const txt = node.nodeValue, m = txt.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/); if (!m) return;
    const raw = m[0], decs = (raw.split(',')[1] || '').length, target = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    const fmt = (v) => { const [i, f] = v.toFixed(decs).split('.'); return (target >= 1000 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : i) + (f ? ',' + f : ''); };
    const t0 = performance.now(), dur = 700;
    const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); node.nodeValue = txt.replace(raw, fmt(target * e)); if (p < 1) requestAnimationFrame(step); else node.nodeValue = txt; };
    requestAnimationFrame(step);
  });
}

/* ---------------------------------------------------------------- ficha del sistema (los 5 elementos del PDF) */
const FICHAS = {};
const FICHA_ROWS = [['datos', 'Tipo de datos', 'data'], ['nivel', 'Nivel de decisión', 'layers'], ['usuarios', 'Usuarios objetivo', 'person'], ['frecuencia', 'Frecuencia', 'clock'], ['formato', 'Formato', 'file'], ['ejemplos', 'Ejemplos reales', 'globe']];
const Ficha = {
  btn: null,
  open(btn) {
    const l = btn.dataset.ficha, t = FICHAS[l], pop = $('#ficha');
    pop.innerHTML = `<div class="fi-h"><span class="chip-l" data-l="${l}"><b>${l.toUpperCase()}</b>${{ tps: 'Operacional', mis: 'Gerencial', dss: 'Decisional', ess: 'Estratégico' }[l]}</span><span class="fi-q">${t.pregunta}</span></div>
      <dl class="fi-list">${FICHA_ROWS.map(([k, lab, ic]) => `<div class="fi-row"><dt>${icon(ic)}${lab}</dt><dd>${t[k]}</dd></div>`).join('')}</dl>`;
    pop.hidden = false;
    const r = btn.getBoundingClientRect(), pw = pop.offsetWidth;
    pop.style.left = clamp(r.left, 8, innerWidth - pw - 8) + 'px'; pop.style.top = (r.bottom + 8) + 'px';
    btn.setAttribute('aria-expanded', 'true'); this.btn = btn;
  },
  close() { const pop = $('#ficha'); if (!pop || pop.hidden) return; pop.hidden = true; if (this.btn) this.btn.setAttribute('aria-expanded', 'false'); },
  isOpen() { const pop = $('#ficha'); return !!pop && !pop.hidden; },
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ficha]');
  if (b) { e.preventDefault(); if (Ficha.isOpen() && Ficha.btn === b) Ficha.close(); else Ficha.open(b); return; }
  if (Ficha.isOpen() && !e.target.closest('#ficha')) Ficha.close();
});
// el logo de arriba a la izquierda reinicia la web: recarga la portada (sin #) con la intro del logo y el kit desde arriba
function restartHome() {
  try { sessionStorage.removeItem('kaidora.intro'); } catch (e) { /* sin sessionStorage la intro sale siempre */ }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = '#home'; }
  try { history.scrollRestoration = 'manual'; } catch (e) { /* recarga sin recordar el scroll */ }
  location.reload();
}
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  e.preventDefault();
  if (g.classList.contains('brand')) { restartHome(); return; }
  let opts = {};
  try { opts = g.dataset.goOpts ? JSON.parse(g.dataset.goOpts) : {}; } catch (err) { opts = {}; }
  if (Drawer.isOpen()) Drawer.close();
  go(g.dataset.go, opts);
});

/* ---------------------------------------------------------------- piezas de informe */
function slicersHtml(which) {
  const opt = (v, t, sel) => `<option value="${v}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`;
  const parts = [];
  if (which.includes('period')) parts.push(`<div class="slicer"><label for="sl-period">Periodo</label><select class="select" id="sl-period" data-f="period">${PERIODS.map((p) => opt(p.id, p.label, S.f.period)).join('')}</select></div>`);
  if (which.includes('ch')) parts.push(`<div class="slicer"><label for="sl-ch">Canal</label><select class="select" id="sl-ch" data-f="ch">${opt(-1, 'Todos', S.f.ch)}${D.channels.map((c, i) => opt(i, c.corto, S.f.ch)).join('')}</select></div>`);
  if (which.includes('li')) parts.push(`<div class="slicer"><label for="sl-li">Línea de kit</label><select class="select" id="sl-li" data-f="li">${opt(-1, 'Todas', S.f.li)}${D.lines.map((l, i) => opt(i, l.nombre, S.f.li)).join('')}</select></div>`);
  if (which.includes('re')) parts.push(`<div class="slicer"><label for="sl-re">Comunidad</label><select class="select" id="sl-re" data-f="re">${opt(-1, 'Todas', S.f.re)}${D.regions.map((r, i) => opt(i, r.nombre, S.f.re)).join('')}</select></div>`);
  const active = which.some((k) => (k === 'period' ? S.f.period !== 'ytd' : S.f[k] >= 0));
  const keys = ['period', 'ch', 'li', 're'].filter((k) => which.includes(k));
  keys.forEach((k, i) => { if (k === 'period' ? S.f.period !== 'ytd' : S.f[k] >= 0) parts[i] = parts[i].replace('class="select"', 'class="select on"'); });
  return `<div class="slicers" role="group" aria-label="Filtros">${parts.join('')}${active ? '<button type="button" class="clear-btn" data-clear>Borrar filtros</button>' : ''}</div>`;
}
function bindSlicers(root, which) {
  $$('select[data-f]', root).forEach((s) => s.addEventListener('change', () => {
    const k = s.dataset.f; S.f[k] = k === 'period' ? s.value : +s.value;
    store('filters', S.f); rerender();
    const again = document.getElementById(s.id); if (again) again.focus();
  }));
  const c = $('[data-clear]', root);
  if (c) c.addEventListener('click', () => { which.forEach((k) => { S.f[k] = k === 'period' ? 'ytd' : -1; }); store('filters', S.f); rerender(); });
}
function setFilter(k, v) { S.f[k] = S.f[k] === v ? -1 : v; store('filters', S.f); rerender(); }
function reportHead(l, title, slicers, extra = '') {
  return `<div class="r-head"><div class="r-title"><span class="chip-l" data-l="${l}"><b>${l.toUpperCase()}</b>${{ tps: 'Operacional', mis: 'Gerencial', dss: 'Decisional', ess: 'Estratégico' }[l]}</span><h1>${title}</h1><button type="button" class="ficha-btn" data-ficha="${l}" aria-haspopup="dialog" aria-expanded="false" aria-controls="ficha">${icon('help')}Ficha</button><button type="button" class="ficha-btn listen-btn" data-listen-panel aria-pressed="false" aria-label="Escuchar el resumen del panel">${icon('sound')}Escuchar</button></div>${extra}${slicers}</div>`;
}
function kpiHtml({ l, v, u = '', d = '', go = null, spark = null, color = 'var(--s1)' }) {
  const tag = go ? 'button' : 'div';
  const attrs = go ? ` type="button" data-go="${go.view}" data-go-opts='${esc(JSON.stringify(go))}' aria-label="${esc(l)}: ${esc(v)}${esc(u)}. Ver detalle"` : '';
  return `<${tag} class="kpi${spark ? ' has-sp' : ''}"${attrs}><span class="kpi-v" data-count>${v}${u ? `<small>${u}</small>` : ''}</span><span class="kpi-l">${l}</span><span class="kpi-d">${d}</span>${spark ? `<span class="kpi-sp">${sparkSvg(spark, { w: 120, h: 30, color, dot: false })}</span>` : ''}${go ? '<span class="kpi-go" aria-hidden="true">↗</span>' : ''}</${tag}>`;
}
