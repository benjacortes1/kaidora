/* ===================================================================== core.js
   Utilidades, estado global, agregación de datos, navegación, filtros,
   accesibilidad, tooltip, toasts y panel lateral de drill-down. */

const D = DATA;
const NM = D.months.length;          // 33 meses: ene-2024 .. sep-2026
const LAST = NM - 1;                 // índice de septiembre de 2026
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CH_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
const FIXED_COST = { 2024: 352000, 2025: 380000, 2026: 405000 };   // costes fijos mensuales (estructura)
const TARGET_2026 = 21100000;                                       // objetivo anual del plan estratégico
const SIM_DATE = new Date(2026, 8, 30);                               // jornada simulada del TPS

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mYear(t) { return +D.months[t].slice(0, 4); }
function mMonth(t) { return +D.months[t].slice(5, 7); }
function mLabel(t, style = 'short') {
  const y = mYear(t), m = mMonth(t);
  if (style === 'long') return `${MES_L[m - 1]} ${y}`;
  if (style === 'tiny') return MES[m - 1];
  return `${MES[m - 1]} ${String(y).slice(2)}`;
}

/* ---------------------------------------------------------------- formato es-ES */
function group(n) {
  const neg = n < 0; const s = String(Math.round(Math.abs(n)));
  return (neg ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function dec(n, d = 1) {
  const neg = n < 0; const v = Math.abs(n).toFixed(d);
  const [i, f] = v.split('.');
  return (neg ? '−' : '') + group(+i) + (f ? ',' + f : '');
}
function fmtN(n) { return group(n); }
function fmtEur(v, opts = {}) {
  const a = Math.abs(v);
  if (!opts.full && a >= 1e6) return dec(v / 1e6, a >= 1e8 ? 0 : 2) + ' M€';
  if (!opts.full && a >= 1e4) return dec(v / 1e3, 0) + ' k€';
  if (opts.cents) return dec(v, 2) + ' €';
  return group(v) + ' €';
}
function fmtPct(v, d = 1) { return dec(v * 100, d) + ' %'; }
function fmtPP(v, d = 1) { return (v > 0 ? '+' : '') + dec(v * 100, d) + ' p. p.'; }
function signPct(v, d = 1) { return (v > 0 ? '+' : v < 0 ? '' : '±') + dec(v * 100, d) + ' %'; }
function deltaHtml(v, { goodUp = true, suffix = '', pp = false, d = 1 } = {}) {
  if (v == null || !isFinite(v)) return '<span class="delta flat">—</span>';
  const cls = Math.abs(v) < 0.0005 ? 'flat' : ((v > 0) === goodUp ? 'up' : 'down');
  const arrow = v > 0 ? '▲' : v < 0 ? '▼' : '■';
  const txt = pp ? fmtPP(v, d) : signPct(v, d);
  return `<span class="delta ${cls}"><span aria-hidden="true">${arrow}</span>${txt}${suffix}</span>`;
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
function pickW(r, weights) {
  const tot = sum(weights); let x = r() * tot;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
  return weights.length - 1;
}
function lnorm(r, s) { // aproximación log-normal
  const u = Math.max(1e-9, r()), v = r();
  return Math.exp(s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

/* ---------------------------------------------------------------- iconos (trazo 2px) */
const IC = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  report: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  compare: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/>',
  puzzle: '<path d="M10 4a2 2 0 114 0v2h4v4h-2a2 2 0 100 4h2v4h-4v-2a2 2 0 10-4 0v2H6v-4h2a2 2 0 100-4H6V6h4z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14c2.6 0 4.4 1.4 5 4.2"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/><path d="M8 7h7"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  a11y: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5"/><path d="M12 10v5l-3 6M12 15l3 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
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
  factory: '<path d="M3 21V10l6 4V10l6 4V6h6v15z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
  truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-7"/>',
  drill: '<path d="M7 17L17 7M9 7h8v8"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.2a2 2 0 002 1.8h8.7a2 2 0 002-1.6L22 7H6"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  resume: '<path d="M7 5v14l12-7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 6.3"/><path d="M20 4v7h-7"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 013 0V12M11 11V4.5a1.5 1.5 0 013 0V12M14 11.5V6a1.5 1.5 0 013 0v8c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.5-1.6L8 14"/>',
  sign: '<path d="M7 11V6a1.5 1.5 0 013 0v4M10 10V4.5a1.5 1.5 0 013 0V10M13 10V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6 7-2.5 0-4-1.3-5.5-3.5L3 13.5a1.5 1.5 0 012.5-1.6L7 14"/>',
  braille: '<circle cx="8" cy="6" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="6" r="1.6"/><circle cx="16" cy="18" r="1.6"/><circle cx="8" cy="18" r="1.6"/>',
};
function icon(name, cls = '') {
  return `<svg class="${cls}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ''}</svg>`;
}
function statusChip(level, text) {
  const ic = { good: 'check', warn: 'alert', serious: 'excl', crit: 'xcirc', info: 'info' }[level];
  return `<span class="status ${level}">${icon(ic)}${esc(text)}</span>`;
}

/* ---------------------------------------------------------------- índices de datos */
const FACTS_BY_M = Array.from({ length: NM }, () => []);
D.facts.forEach((f) => FACTS_BY_M[f[0]].push(f));
const BUDGET = Array.from({ length: NM }, () => new Array(D.channels.length).fill(0));
D.budget.forEach((b) => { BUDGET[b[0]][b[1]] = b[2]; });

/* ---------------------------------------------------------------- estado */
const S = {
  view: 'home',
  misTab: 'ventas',
  dssTab: 'kit',
  f: { period: 'ytd', ch: -1, li: -1, co: -1 },
  extra: [],        // transacciones registradas hoy en el TPS (se suman a septiembre de 2026)
  live: true,
  prefs: { theme: 'system', contrast: 'normal', font: '1', textures: false, easy: true, motion: 'system' },
};
const Bus = {
  h: {},
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); },
  emit(ev, p) { (this.h[ev] || []).forEach((fn) => { try { fn(p); } catch (e) { console.error(e); } }); },
};

const PERIODS = [
  { id: 'm', label: 'Septiembre 2026', months: [LAST] },
  { id: 'q', label: '3.er trimestre 2026', months: range(LAST - 2, LAST) },
  { id: 'ytd', label: '2026 (ene–sep)', months: range(24, LAST) },
  { id: 'l12', label: 'Últimos 12 meses', months: range(LAST - 11, LAST) },
  { id: 'y25', label: 'Año 2025', months: range(12, 23) },
  { id: 'y24', label: 'Año 2024', months: range(0, 11) },
  { id: 'all', label: 'Todo (2024–2026)', months: range(0, LAST) },
];
function periodObj(id = S.f.period) { return PERIODS.find((p) => p.id === id) || PERIODS[2]; }
function periodMonths(id) { return periodObj(id).months; }
function prevMonths(ms) { return ms.every((t) => t - 12 >= 0) ? ms.map((t) => t - 12) : null; }

function matches(f, flt) {
  return (flt.ch < 0 || f[1] === flt.ch) && (flt.li < 0 || f[2] === flt.li) && (flt.co < 0 || f[3] === flt.co);
}
function emptyAgg() { return { rev: 0, units: 0, cogs: 0, ccost: 0, logi: 0, ret: 0, orders: 0 }; }
function addTo(o, f) {
  o.rev += f[5]; o.units += f[4]; o.cogs += f[6]; o.ccost += f[7]; o.logi += f[8]; o.ret += f[9];
  o.orders += f[4] / D.channels[f[1]].upo;
}
/** Agrega hechos de venta de los meses indicados aplicando filtros. */
function agg(months, flt = S.f) {
  const r = emptyAgg();
  r.byM = new Map(months.map((t) => [t, emptyAgg()]));
  r.byCh = D.channels.map(() => emptyAgg());
  r.byLi = D.lines.map(() => emptyAgg());
  r.byCo = D.countries.map(() => emptyAgg());
  const mset = new Set(months);
  for (const t of months) {
    const rows = t === LAST ? FACTS_BY_M[t].concat(S.extra) : FACTS_BY_M[t];
    for (const f of rows) {
      if (!matches(f, flt)) continue;
      addTo(r, f); addTo(r.byM.get(t), f); addTo(r.byCh[f[1]], f); addTo(r.byLi[f[2]], f); addTo(r.byCo[f[3]], f);
    }
  }
  r.contrib = r.rev - r.cogs - r.ccost - r.logi;
  r.months = months.filter((t) => mset.has(t));
  return r;
}
/** Presupuesto (solo existe por canal). Devuelve null si hay filtro de línea o país. */
function budgetFor(months, flt = S.f) {
  if (flt.li >= 0 || flt.co >= 0) return null;
  return sum(months, (t) => (flt.ch < 0 ? sum(BUDGET[t]) : BUDGET[t][flt.ch]));
}
function budgetByM(months, flt = S.f) {
  if (flt.li >= 0 || flt.co >= 0) return null;
  return months.map((t) => (flt.ch < 0 ? sum(BUDGET[t]) : BUDGET[t][flt.ch]));
}
function filterText(flt = S.f) {
  const parts = [];
  if (flt.ch >= 0) parts.push(D.channels[flt.ch].corto);
  if (flt.li >= 0) parts.push(D.lines[flt.li].nombre);
  if (flt.co >= 0) parts.push(D.countries[flt.co].nombre);
  return parts.length ? parts.join(' · ') : 'todos los canales, líneas y países';
}

/* ---------------------------------------------------------------- personas */
const EMP = D.employees;
const GENDERS = [
  { id: 'M', nombre: 'Mujeres', color: 'var(--g-m)' },
  { id: 'H', nombre: 'Hombres', color: 'var(--g-h)' },
];
const fte = (e) => e.salario / (e.jornada === 'Parcial' ? 0.75 : 1);
function mean(arr) { return arr.length ? sum(arr) / arr.length : 0; }
function payGap(list) {
  const w = list.filter((e) => e.genero === 'M'), h = list.filter((e) => e.genero === 'H');
  if (w.length < 3 || h.length < 3) return null;
  return 1 - mean(w.map(fte)) / mean(h.map(fte));
}
/** Brecha ajustada: media ponderada de las brechas dentro de cada puesto con ambos géneros. */
function adjustedGap() {
  const byRole = {};
  EMP.forEach((e) => { (byRole[e.puesto] = byRole[e.puesto] || []).push(e); });
  let wsum = 0, gsum = 0;
  Object.values(byRole).forEach((list) => {
    const w = list.filter((e) => e.genero === 'M'), h = list.filter((e) => e.genero === 'H');
    if (w.length && h.length) {
      const g = 1 - mean(w.map(fte)) / mean(h.map(fte));
      gsum += g * list.length; wsum += list.length;
    }
  });
  return wsum ? gsum / wsum : 0;
}
const HR = {
  total: EMP.length,
  women: EMP.filter((e) => e.genero === 'M').length,
  men: EMP.filter((e) => e.genero === 'H').length,
  other: EMP.filter((e) => e.genero === 'X').length,
  leaders: EMP.filter((e) => e.nivel === 'dir' || e.nivel === 'mi'),
  disc: EMP.filter((e) => e.disc).length,
  gap: payGap(EMP),
  gapAdj: adjustedGap(),
  avgAge: mean(EMP.map((e) => e.edad)),
  over55: EMP.filter((e) => e.edad >= 55).length,
  under30: EMP.filter((e) => e.edad < 30).length,
};
HR.leadersW = HR.leaders.filter((e) => e.genero === 'M').length;
const AGE_BANDS = [['<25', 0, 24], ['25–34', 25, 34], ['35–44', 35, 44], ['45–54', 45, 54], ['55+', 55, 99]];
function ageBand(a) { return AGE_BANDS.findIndex(([, lo, hi]) => a >= lo && a <= hi); }

/* ---------------------------------------------------------------- utilidades DOM */
function mount(id, html) { const el = document.getElementById(id); el.innerHTML = html; return el; }
function slot(root, name) { return root.querySelector(`[data-slot="${name}"]`); }
function put(root, name, node) { const s = slot(root, name); if (s) s.replaceWith(node); return node; }
function frag(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

/* ---------------------------------------------------------------- tooltip */
const Tip = {
  el: null,
  show(x, y, node) {
    if (!this.el) this.el = document.getElementById('tip');
    this.el.replaceChildren(node);
    this.el.classList.add('show');
    const r = this.el.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    this.el.style.left = Math.max(8, left) + 'px';
    this.el.style.top = Math.max(8, top) + 'px';
  },
  hide() { if (this.el) this.el.classList.remove('show'); },
};
/** Construye el contenido del tooltip: título + filas {name, value, color, key:'line'|'rect'} */
function tipNode(title, rows) {
  const box = document.createElement('div');
  const t = document.createElement('div'); t.className = 'tt'; t.textContent = title; box.appendChild(t);
  rows.forEach((r) => {
    const row = document.createElement('div'); row.className = 'tr';
    const name = document.createElement('span');
    if (r.color) {
      const k = document.createElement('i'); k.className = r.key === 'rect' ? 'swatch' : 'line-key'; k.style.background = r.color; name.appendChild(k);
    }
    name.appendChild(document.createTextNode(r.name));
    const v = document.createElement('b'); v.textContent = r.value;
    row.append(v, name);
    row.style.flexDirection = 'row-reverse';
    box.appendChild(row);
  });
  return box;
}

/* ---------------------------------------------------------------- toasts */
function toast(title, msg = '', ic = 'check') {
  const wrap = document.getElementById('toasts');
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `${icon(ic)}<div><b></b><span></span></div>`;
  t.querySelector('b').textContent = title; t.querySelector('span').textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 4200);
  setTimeout(() => t.remove(), 4600);
}

/* ---------------------------------------------------------------- drawer de drill-down */
const Drawer = {
  last: null,
  open({ title, path, body }) {
    this.last = document.activeElement;
    const d = document.getElementById('drawer');
    $('#drawer-title').textContent = title;
    $('#drawer-path').innerHTML = path || '';
    const b = $('#drawer-body'); b.replaceChildren(); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
    d.hidden = false; d.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => { d.classList.add('show'); $('#drawer-scrim').classList.add('show'); $('#drawer-close').focus(); });
  },
  close() {
    const d = document.getElementById('drawer');
    if (!d.classList.contains('show')) return;
    d.classList.remove('show'); $('#drawer-scrim').classList.remove('show'); d.setAttribute('aria-hidden', 'true');
    setTimeout(() => { d.hidden = true; }, 260);
    if (this.last && this.last.focus) this.last.focus();
  },
  isOpen() { return document.getElementById('drawer').classList.contains('show'); },
};

/* ---------------------------------------------------------------- preferencias de accesibilidad */
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('kaidora.' + k)); localStorage.setItem('kaidora.' + k, JSON.stringify(v)); } catch (e) { return null; } return null; }
function applyPrefs() {
  const p = S.prefs, root = document.documentElement;
  if (p.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', p.theme);
  if (p.contrast === 'more') root.setAttribute('data-contrast', 'more'); else root.removeAttribute('data-contrast');
  if (p.font === '1') root.removeAttribute('data-fontscale'); else root.setAttribute('data-fontscale', p.font);
  root.setAttribute('data-textures', p.textures ? 'on' : 'off');
  root.setAttribute('data-easy', p.easy ? 'on' : 'off');
  if (p.motion === 'reduce') root.setAttribute('data-motion', 'reduce'); else root.removeAttribute('data-motion');
  // reflejar en el panel
  $$('#a11y [data-pref]').forEach((b) => {
    const k = b.dataset.pref, v = b.dataset.val;
    if (b.type === 'checkbox') b.checked = k === 'motion' ? p.motion === 'reduce' : !!p[k];
    else b.setAttribute('aria-pressed', String(p[k] === v));
  });
  store('prefs', p);
}
function reducedMotion() {
  return S.prefs.motion === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function initA11y() {
  const saved = store('prefs');
  if (saved && typeof saved === 'object') Object.assign(S.prefs, saved);
  if (!saved && window.matchMedia && matchMedia('(prefers-contrast: more)').matches) S.prefs.contrast = 'more';
  const pop = $('#a11y'), btn = $('#a11y-btn');
  btn.addEventListener('click', () => toggleA11y());
  $('#a11y-close').addEventListener('click', () => toggleA11y(false));
  pop.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pref]'); if (!b) return;
    S.prefs[b.dataset.pref] = b.dataset.val; applyPrefs(); Bus.emit('prefs');
  });
  pop.addEventListener('change', (e) => {
    const c = e.target.closest('input[data-pref]'); if (!c) return;
    S.prefs[c.dataset.pref] = c.checked;
    if (c.dataset.pref === 'motion') S.prefs.motion = c.checked ? 'reduce' : 'system';
    applyPrefs(); Bus.emit('prefs');
  });
  $('#a11y-live').addEventListener('change', (e) => setLive(!e.target.checked));
  applyPrefs();
}
function toggleA11y(force) {
  const pop = $('#a11y'), btn = $('#a11y-btn');
  const open = force === undefined ? pop.hidden : force;
  pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  if (open) { const f = pop.querySelector('button, input'); f && f.focus(); } else btn.focus();
}

/* ---------------------------------------------------------------- navegación */
const VIEWS = {
  home: { title: 'Inicio', crumb: 'Pirámide de sistemas', filters: false },
  tps: { title: 'TPS', crumb: 'TPS · Procesamiento de transacciones', filters: true, note: 'En el TPS, canal, línea y país filtran el registro en vivo. El periodo no aplica: el TPS trabaja con la jornada de hoy.' },
  mis: { title: 'MIS', crumb: 'MIS · Información gerencial', filters: true, note: 'Los filtros se aplican a los informes de ventas. Personas y operaciones indican en cada tarjeta qué filtros usan.' },
  dss: { title: 'DSS', crumb: 'DSS · Apoyo a la decisión', filters: false },
  ess: { title: 'ESS', crumb: 'ESS · Información para ejecutivos', filters: true, note: 'El periodo y los filtros afectan a los indicadores financieros y comerciales. Los indicadores estratégicos de personas son siempre a 30/09/2026.' },
  cmp: { title: 'Comparativa', crumb: 'Comparativa de los 4 sistemas', filters: false },
  odoo: { title: 'Odoo', crumb: 'Mapa de módulos de Odoo', filters: false },
  ods: { title: 'ODS', crumb: 'Enfoque inclusivo · ODS 5, 9 y 10', filters: false },
  team: { title: 'Equipo', crumb: 'Equipo y plan de trabajo', filters: false },
  gloss: { title: 'Glosario', crumb: 'Glosario y bibliografía', filters: false },
};
const RENDER = {};   // cada vista registra aquí su función render
const rendered = {};

function go(view, opts = {}) {
  if (!VIEWS[view]) view = 'home';
  if (opts.tab && view === 'mis') S.misTab = opts.tab;
  if (opts.tab && view === 'dss') S.dssTab = opts.tab;
  if (opts.filter) { Object.assign(S.f, opts.filter); syncFilterUI(); }
  const changed = S.view !== view;
  S.view = view;
  $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + view; });
  $$('.nav-link').forEach((a) => { if (a.dataset.go === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#crumb-cur').textContent = VIEWS[view].crumb;
  const fb = $('#filterbar');
  fb.hidden = !VIEWS[view].filters;
  $('#filter-note').textContent = VIEWS[view].note || '';
  if (RENDER[view]) { RENDER[view](opts); rendered[view] = true; }
  if (location.hash.slice(1) !== view) { try { history.replaceState(null, '', '#' + view); } catch (e) { /* sin historial */ } }
  closeSidebar();
  if (changed && !opts.keepScroll) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const h = $('#view-' + view + ' h1'); if (h && !opts.noFocus) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  if (opts.scrollTo) {
    requestAnimationFrame(() => {
      const t = document.getElementById(opts.scrollTo);
      if (t) {
        const y = t.getBoundingClientRect().top + scrollY - 140;
        window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
        t.animate && !reducedMotion() && t.animate([{ boxShadow: '0 0 0 3px var(--brand)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1600 });
      }
    });
  }
  Bus.emit('view', view);
}
function rerender() { if (RENDER[S.view]) RENDER[S.view]({ keep: true }); }
function openSidebar() { $('#sidebar').classList.add('open'); $('#menu-btn').setAttribute('aria-expanded', 'true'); $('#side-scrim').classList.add('show'); }
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#menu-btn').setAttribute('aria-expanded', 'false'); $('#side-scrim').classList.remove('show'); }

/* ---------------------------------------------------------------- barra de filtros */
function initFilters() {
  const per = $('#f-period'), ch = $('#f-ch'), li = $('#f-li'), co = $('#f-co');
  per.innerHTML = PERIODS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
  ch.innerHTML = '<option value="-1">Todos los canales</option>' + D.channels.map((c, i) => `<option value="${i}">${esc(c.corto)}</option>`).join('');
  li.innerHTML = '<option value="-1">Todas las líneas</option>' + D.lines.map((l, i) => `<option value="${i}">${esc(l.nombre)}</option>`).join('');
  co.innerHTML = '<option value="-1">Todos los países</option>' + D.countries.map((c, i) => `<option value="${i}">${esc(c.nombre)}</option>`).join('');
  const onChange = () => {
    S.f = { period: per.value, ch: +ch.value, li: +li.value, co: +co.value };
    store('filters', S.f);
    Bus.emit('filters');
    rerender();
  };
  [per, ch, li, co].forEach((s) => s.addEventListener('change', onChange));
  $('#f-reset').addEventListener('click', () => { S.f = { period: 'ytd', ch: -1, li: -1, co: -1 }; syncFilterUI(); store('filters', S.f); Bus.emit('filters'); rerender(); });
  const saved = store('filters');
  if (saved && typeof saved === 'object' && PERIODS.some((p) => p.id === saved.period)) Object.assign(S.f, saved);
  syncFilterUI();
}
function syncFilterUI() {
  $('#f-period').value = S.f.period; $('#f-ch').value = String(S.f.ch); $('#f-li').value = String(S.f.li); $('#f-co').value = String(S.f.co);
  const active = S.f.ch >= 0 || S.f.li >= 0 || S.f.co >= 0 || S.f.period !== 'ytd';
  $('#f-reset').hidden = !active;
}

/* ---------------------------------------------------------------- componentes HTML reutilizables */
function kpiHtml({ label, value, unit = '', delta = '', foot = '', drill = null, id = '', spark = '', title = '' }) {
  const tag = drill ? 'button' : 'div';
  const attrs = drill ? ` type="button" data-go="${drill.view}" data-go-opts='${esc(JSON.stringify(drill))}' aria-label="${esc(label)}: ${esc(value)} ${esc(unit)}. ${esc(title || 'Ver detalle en el nivel inferior')}"` : '';
  return `<${tag} class="kpi"${attrs}${id ? ` id="${id}"` : ''}>
    ${drill ? icon('drill', 'drill') : ''}
    <span class="kpi-label">${label}</span>
    <span class="kpi-value">${value}${unit ? `<small>${unit}</small>` : ''}</span>
    ${delta || foot ? `<span class="kpi-foot">${delta}${foot ? `<span>${foot}</span>` : ''}</span>` : ''}
    ${spark ? `<span class="kpi-spark">${spark}</span>` : ''}
  </${tag}>`;
}
function fichaHtml(f) {
  const li = (arr) => `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  return `<section class="ficha" aria-label="Ficha del sistema">
    <div><h4>${icon('data')}Tipo de datos</h4>${li(f.datos)}</div>
    <div><h4>${icon('layers')}Nivel de decisión</h4><p><strong>${f.nivel}</strong></p><p>${f.nivelTxt}</p></div>
    <div><h4>${icon('person')}Usuarios objetivo</h4>${li(f.usuarios)}</div>
    <div><h4>${icon('clock')}Frecuencia y formato</h4><p><strong>${f.frecuencia}</strong></p><p>${f.formato}</p></div>
    <div><h4>${icon('globe')}Ejemplos reales en el sector</h4>${li(f.ejemplos)}</div>
    <p class="ficha-why">${icon('bulb')}<span><strong>Por qué existe:</strong> ${f.porque}</span></p>
  </section>`;
}
function panelHead({ l, levelName, title, q, extra = '' }) {
  return `<header class="panel-head">
    <div>
      <span class="lvl-chip" data-l="${l}"><b>${l.toUpperCase()}</b>${levelName}</span>
      <h1 style="margin-top:10px">${title}</h1>
      <p class="q">${q}</p>
    </div>
    <div class="row">${extra}</div>
  </header>`;
}
function propagation(active = []) {
  const n = (id, txt) => `<span class="node${active.includes(id) ? ' on' : ''}" data-node="${id}">${txt}</span>`;
  return `<div class="prop" aria-hidden="true">${n('tps', 'TPS')}<span>→</span>${n('mis', 'MIS')}<span>→</span>${n('dss', 'DSS')}<span>→</span>${n('ess', 'ESS')}</div>`;
}

/* delegación: cualquier elemento con data-go navega */
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (!g) return;
  e.preventDefault();
  let opts = {};
  try { opts = g.dataset.goOpts ? JSON.parse(g.dataset.goOpts) : {}; } catch (err) { opts = {}; }
  if (Drawer.isOpen()) Drawer.close();
  go(g.dataset.go, opts);
});
