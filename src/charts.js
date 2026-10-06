/* ===================================================================== charts.js
   Objetos visuales SVG sin dependencias, al estilo Power BI: ocupan el alto y el ancho
   de su tarjeta, con tooltip, teclado, clic para filtrar, leyenda interactiva,
   modo enfoque, vista de datos y animación de entrada. */

const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) {
    if (attrs[k] == null) continue;
    if (k === 'style') Object.assign(e.style, attrs[k]);
    else if (k === 'text') e.textContent = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(e);
  return e;
}
/* ancho de un texto (para colocar etiquetas): se mide una vez y se recuerda; al cargar la fuente Inter se vacía la memoria
   y se redibujan los gráficos visibles, porque hasta entonces se medía con la fuente de reserva */
let _ctx; const _tw = new Map();
function textW(str, size = 10.5, weight = 400) {
  const k = weight + '|' + size + '|' + str;
  let w = _tw.get(k);
  if (w === undefined) {
    _ctx = _ctx || document.createElement('canvas').getContext('2d');
    _ctx.font = `${weight} ${size}px Inter, "Segoe UI", system-ui, sans-serif`;
    w = _ctx.measureText(String(str)).width;
    if (_tw.size > 4000) _tw.clear();
    _tw.set(k, w);
  }
  return w;
}
if (document.fonts) document.fonts.addEventListener('loadingdone', () => {
  _tw.clear();
  $$('.view:not([hidden]) .tile, #focus-body .tile').forEach((t) => { if (t.redraw) t.redraw(false); });
});
function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range)); const f = range / Math.pow(10, exp);
  const nf = round ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
  return nf * Math.pow(10, exp);
}
function niceScale(min, max, ticks = 5) {
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (max === min) max = min + (Math.abs(min) || 1);
  const step = niceNum(niceNum(max - min, false) / (ticks - 1), true);
  const nmin = Math.floor(min / step) * step, nmax = Math.ceil(max / step) * step;
  const arr = []; for (let v = nmin; v <= nmax + step / 2; v += step) arr.push(+v.toFixed(10));
  return { min: nmin, max: nmax, ticks: arr };
}
function barPath(x, y, w, h, dir = 'up', r = 3) {
  if (w <= 0 || h <= 0) return '';
  if (dir === 'up') { r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  if (dir === 'right') { r = Math.min(r, h / 2, w); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; }
  if (dir === 'left') { r = Math.min(r, h / 2, w); return `M${x + w},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w}Z`; }
  return `M${x},${y}h${w}v${h}h${-w}Z`;
}
/** Marca de datos: la clase indica la dirección de la animación de entrada. */
function mark(p, d, color, dir = 'up', extra = {}) {
  return sv('path', Object.assign({ d, class: 'mk ' + (dir === 'up' ? 'mk-v' : dir === 'right' ? 'mk-h' : dir === 'left' ? 'mk-hl' : 'mk-v'), style: { fill: color } }, extra), p);
}
const elXY = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + 8]; };

/* ---------------------------------------------------------------- iconos de las tarjetas */
const TICON = {
  focus: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  data: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
};
const ticon = (n) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TICON[n]}</svg>`;

/**
 * Tarjeta de objeto visual.
 * o = { title, aside, legend:[{name,color,key,toggle}], cls, id, alt, draw(el, w, h, hidden), body, table() → {head, rows, align} }
 */
function tile(o) {
  const el = document.createElement('section');
  el.className = 'tile ' + (o.cls || ''); if (o.id) el.id = o.id;
  el.setAttribute('aria-label', o.title);
  const hidden = new Set(o.hidden || []);
  const listen = o.listen ? `<button type="button" class="ta ta-listen" data-listen title="Escuchar el gráfico" aria-label="Escuchar «${esc(o.title)}»" aria-pressed="false">${ticon('sound')}</button>` : '';
  const acts = o.draw ? `<span class="tile-act">${o.table ? `<button type="button" class="ta" data-act="data" title="Ver datos" aria-label="Ver datos de «${esc(o.title)}»">${ticon('data')}</button>` : ''}<button type="button" class="ta" data-act="focus" title="Modo enfoque" aria-label="Ampliar «${esc(o.title)}»">${ticon('focus')}</button></span>` : '';
  el.innerHTML = `<div class="tile-h"><h3></h3><span class="tile-r">${o.aside ? `<span class="aside">${o.aside}</span>` : ''}${listen}${acts}</span></div>${o.legend ? '<div class="legend"></div>' : ''}${o.draw ? '<div class="chart" role="img"></div>' : ''}${o.body || ''}`;
  el.querySelector('h3').textContent = o.title;
  if (o.listen) {
    // el resumen se escucha con el botón y también queda como descripción para lectores de pantalla
    const lb = el.querySelector('[data-listen]');
    lb.addEventListener('click', () => { const d = o.listen(); Listen.play(lb, { title: o.title, summary: d.summary, values: d.values }); });
    try { el.setAttribute('aria-description', o.listen().summary); } catch (e) { /* sin resumen */ }
  }
  if (o.legend) {
    const lg = el.querySelector('.legend');
    o.legend.forEach((it) => {
      const node = document.createElement(it.toggle ? 'button' : 'span');
      if (it.toggle) { node.type = 'button'; node.className = 'lg-btn'; node.setAttribute('aria-pressed', String(!hidden.has(it.name))); node.title = 'Mostrar u ocultar la serie'; }
      node.innerHTML = it.key === 'line' ? `<i class="line-key" style="background:${it.color}${it.dash ? `;background:repeating-linear-gradient(90deg,${it.color} 0 4px,transparent 4px 7px)` : ''}"></i>` : `<i class="swatch" style="background:${it.color}"></i>`;
      node.appendChild(document.createTextNode(it.name));
      if (it.toggle) node.addEventListener('click', () => { if (hidden.has(it.name)) hidden.delete(it.name); else hidden.add(it.name); node.setAttribute('aria-pressed', String(!hidden.has(it.name))); el.redraw(true); });
      lg.appendChild(node);
    });
  }
  if (o.draw) {
    const chart = el.querySelector('.chart');
    chart.setAttribute('aria-label', o.title + (o.alt ? '. ' + o.alt : ''));
    // near: el gráfico está en pantalla o a menos de 300 px; los que quedan más abajo (móvil) se dibujan al acercarse
    let last = '', first = !o.noAnim, ro = null, io = null, near = !window.IntersectionObserver;
    const draw = (force) => {
      // gráfico ya sustituido (cambio de filtro o de panel): se deja de observar para no acumular memoria
      if (!chart.isConnected && !first && last) { if (ro) ro.disconnect(); if (io) io.disconnect(); return; }
      if (!near) return;
      const w = Math.floor(chart.clientWidth), h = Math.floor(chart.clientHeight);
      if (w < 20 || h < 20 || (!force && `${w}x${h}` === last)) return;
      last = `${w}x${h}`;
      try {
        o.draw(chart, w, h, hidden);
        chartA11y(chart);
        const svg = chart.querySelector('svg');
        if (svg && first && S.animate && !reducedMotion()) svg.classList.add('enter');
        first = false;
      } catch (err) { console.error(err); }
    };
    // al cambiar el tamaño se redibuja una vez, cuando para (no en cada fotograma del cambio); el primer dibujo, al momento
    if (window.ResizeObserver) { let rt = 0; ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => draw(), last ? 120 : 0); }); ro.observe(chart); }
    if (!near) {
      io = new IntersectionObserver((es) => {
        if (!chart.isConnected) { io.disconnect(); return; }
        if (es.some((e) => e.isIntersecting)) { near = true; io.disconnect(); draw(true); }
      }, { rootMargin: '300px 0px' });
      io.observe(chart);
    }
    setTimeout(draw, 30);
    el.redraw = (keepAnim) => { if (!keepAnim) first = false; draw(true); };
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => Focus.open(o, b.dataset.act === 'data' ? 'data' : 'chart', hidden)));
  }
  return el;
}

/* lectores de pantalla: un gráfico sin elementos que se puedan pulsar es una imagen con su descripción; si tiene barras o
   comunidades que se pulsan con el teclado, es un grupo con esos botones (y el resto del dibujo queda oculto para no leer ejes) */
function chartA11y(chart) {
  const svg = chart.querySelector('svg'); if (!svg) return;
  if (!svg.querySelector('[tabindex="0"]')) { chart.setAttribute('role', 'img'); svg.setAttribute('aria-hidden', 'true'); return; }
  chart.setAttribute('role', 'group');
  svg.removeAttribute('aria-hidden'); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', chart.getAttribute('aria-label') || '');
  const hide = (node) => { for (const c of node.children) { if (c.hasAttribute('tabindex')) continue; if (c.querySelector('[tabindex]')) hide(c); else c.setAttribute('aria-hidden', 'true'); } };
  hide(svg);
}

/* ---------------------------------------------------------------- modo enfoque / ver datos */
/* todos los recuadros se pueden ampliar: a los que no tienen gráfico se les añade el botón */
function addZoomButtons(root) {
  // tablas con scroll propio: se pueden enfocar y desplazar con el teclado (y el lector anuncia de qué tabla se trata)
  $$('.tbl:not([tabindex])', root).forEach((t) => {
    const tl = t.closest('.tile'), h = tl && tl.querySelector('h3');
    t.tabIndex = 0; t.setAttribute('role', 'region'); t.setAttribute('aria-label', h ? h.textContent : 'Tabla');
    t.setAttribute('data-lenis-prevent', '');       // su scroll es nativo aunque Lenis esté activo
  });
  $$('.tile', root).forEach((t) => {
    if (t.dataset.zoomable || t.classList.contains('focus-tile') || t.classList.contains('tile-ph') || t.querySelector('[data-act="focus"]')) return;
    const head = t.querySelector('.tile-h'); if (!head) return;
    t.dataset.zoomable = '1';
    let right = head.querySelector('.tile-r');
    if (!right) { right = document.createElement('span'); right.className = 'tile-r'; head.appendChild(right); }
    const name = (head.querySelector('h3') || {}).textContent || 'recuadro';
    const act = document.createElement('span'); act.className = 'tile-act';
    act.innerHTML = `<button type="button" class="ta" data-zoom title="Ampliar" aria-label="Ampliar «${esc(name)}»">${ticon('focus')}</button>`;
    right.appendChild(act);
  });
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-zoom]'); if (b && !Focus.isOpen()) { e.preventDefault(); Focus.openNode(b.closest('.tile')); } });
function watchZoomButtons() {
  const main = document.getElementById('main'); if (!main || !window.MutationObserver) return;
  let pend = 0;
  new MutationObserver(() => { if (!pend) pend = setTimeout(() => { pend = 0; addZoomButtons(main); }, 0); }).observe(main, { childList: true, subtree: true });
  addZoomButtons(main);
}

const Focus = {
  last: null,
  open(o, mode, hidden) {
    this.cancel();
    this.last = document.activeElement; this.o = o; this.hidden = hidden;
    $('#focus-title').textContent = o.title;
    $('#focus-seg').hidden = !o.table;
    this.mode(mode);
    $('#focus').hidden = false;
    requestAnimationFrame(() => { $('#focus').classList.add('show'); $('#focus-scrim').classList.add('show'); $('#focus-close').focus(); });
  },
  mode(m) {
    const body = $('#focus-body'); const o = this.o;
    $$('#focus-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    if (m === 'data' && o.table) {
      const t = o.table(); const al = t.align || [];
      body.innerHTML = `<div class="tbl"><table class="t big"><thead><tr>${t.head.map((h, i) => `<th${al[i] === 'r' ? ' class="r"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => `<td${al[i] === 'r' ? ' class="r"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    } else {
      body.replaceChildren(tile(Object.assign({}, o, { cls: 'focus-tile', id: null, aside: null, table: null, noAnim: true, hidden: [...this.hidden] })));
      const ft = body.querySelector('.tile'); ft.querySelectorAll('.tile-act').forEach((x) => x.remove());
    }
  },
  /* recuadros sin gráfico: se mueve el recuadro real a la ventana (conserva filtros, deslizadores y clics) y vuelve al cerrar */
  openNode(el) {
    this.cancel();
    this.last = document.activeElement; this.o = null;
    const ph = document.createElement('section');
    ph.className = el.className + ' tile-ph'; if (el.dataset.area) ph.dataset.area = el.dataset.area; ph.setAttribute('aria-hidden', 'true');
    el.replaceWith(ph); this.moved = { el, ph };
    $('#focus-title').textContent = (el.querySelector('h3') || {}).textContent || '';
    $('#focus-seg').hidden = true;
    el.classList.add('tile-zoom');
    $('#focus-body').replaceChildren(el);
    $('#focus').hidden = false;
    requestAnimationFrame(() => { $('#focus').classList.add('show'); $('#focus-scrim').classList.add('show'); $('#focus-close').focus(); });
  },
  /* now: cierre sin animación (al cambiar de panel) */
  close(now) {
    const f = $('#focus'); if (f.hidden || this.closing) return;
    f.classList.remove('show'); $('#focus-scrim').classList.remove('show');
    if (this.moved) { const { el, ph } = this.moved; el.classList.remove('tile-zoom'); if (ph.isConnected) ph.replaceWith(el); this.moved = null; }
    const end = () => { this.closing = 0; f.hidden = true; $('#focus-body').replaceChildren(); };
    if (now) end(); else this.closing = setTimeout(end, 200);
    Tip.hide();
    if (!now && this.last && this.last.focus) this.last.focus();
  },
  /* si se vuelve a abrir mientras se cierra, el cierre pendiente no debe vaciar la nueva ventana */
  cancel() { if (this.closing) { clearTimeout(this.closing); this.closing = 0; } },
  isOpen() { return !$('#focus').hidden && !this.closing; },
};

/* ---------------------------------------------------------------- exploración (ratón y teclado) */
function explorer(svg, { x, y, w, h, n, xAt, show, onClick, label }) {
  let cur = -1;
  // para el teclado y los lectores de pantalla es un deslizador: las flechas recorren los puntos y se anuncia el valor de cada uno
  const ov = sv('rect', { x, y, width: w, height: h, class: 'hit' + (onClick ? ' clickable' : ''), tabindex: 0, role: 'slider', 'aria-orientation': 'horizontal',
    'aria-valuemin': 1, 'aria-valuemax': n, 'aria-valuenow': n, 'aria-label': label || 'Explorar valores con las flechas' + (onClick ? '; Intro para ver el detalle' : '') }, svg);
  const idx = (cx) => {
    const r = svg.getBoundingClientRect(); const sx = cx - r.left; let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(xAt(i) - sx); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const at = (i) => { const r = svg.getBoundingClientRect(); return [r.left + xAt(i), r.top + y + 10]; };
  ov.addEventListener('pointermove', (e) => { cur = idx(e.clientX); show(cur, e.clientX, e.clientY); });
  ov.addEventListener('pointerleave', () => { show(-1); Tip.hide(); });
  ov.addEventListener('click', (e) => { if (onClick) onClick(idx(e.clientX)); });
  const announce = () => {
    ov.setAttribute('aria-valuenow', cur + 1);
    const t = document.getElementById('tip'); const txt = t && !t.hidden ? t.innerText.replace(/\s*\n+\s*/g, '. ').trim() : '';
    if (txt) ov.setAttribute('aria-valuetext', txt);
  };
  ov.addEventListener('focus', () => { if (cur < 0) cur = n - 1; show(cur, ...at(cur)); announce(); });
  ov.addEventListener('blur', () => { show(-1); Tip.hide(); });
  ov.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      cur = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1);
      show(cur, ...at(cur)); announce();
    } else if ((e.key === 'Enter' || e.key === ' ') && onClick && cur >= 0) { e.preventDefault(); onClick(cur); }
  });
}

/* ---------------------------------------------------------------- líneas */
function drawLine(el, W, H, o) {
  const n = o.labels.length;
  const series = o.series.filter((s) => !(o.hidden && o.hidden.has(s.name)));
  const vals = series.flatMap((s) => s.values.filter((v) => v != null)).concat((o.refs || []).map((r) => r.v));
  if (!vals.length) vals.push(0, 1);
  let lo = o.yMin != null ? o.yMin : (o.zero === false ? Math.min(...vals) : Math.min(0, ...vals));
  let hi = o.yMax != null ? o.yMax : Math.max(...vals);
  if (o.zero === false && o.yMin == null) { const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad * 0.4; }
  const sc = niceScale(lo, hi, H < 170 ? 4 : 5);
  const endW = o.endLabels === false ? 8 : Math.max(34, ...series.filter((s) => !s.noLabel).map((s) => textW((s.fmt || o.yFmt)(s.values.filter((v) => v != null).slice(-1)[0] || 0), 11, 700))) + 12;
  const m = { t: 10, r: endW, b: 22, l: Math.max(30, ...sc.ticks.map((v) => textW(o.yFmt(v)))) + 10 };
  const iw = Math.max(30, W - m.l - m.r), ih = Math.max(20, H - m.t - m.b);
  const X = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const Y = (v) => m.t + ih - ((v - sc.min) / (sc.max - sc.min)) * ih;
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  (o.bands || []).forEach((b) => sv('rect', { x: X(b.from) - 3, y: m.t, width: X(b.to) - X(b.from) + 6, height: ih, rx: 3, style: { fill: 'var(--band)' } }, svg));
  sc.ticks.forEach((v) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v === sc.min || v === 0 ? 'base-l' : 'grid-l' }, svg);
    sv('text', { x: m.l - 6, y: Y(v) + 3.5, 'text-anchor': 'end', class: 'ax', text: o.yFmt(v) }, svg);
  });
  // etiquetas del eje x: tantas como quepan sin pisarse (si el panel pide un paso, se usa un múltiplo de ese paso)
  const labW = Math.max(...o.labels.map((l) => textW(String(l)))) + 14;
  const fit = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / Math.max(50, labW)))));
  const every = o.xEvery ? o.xEvery * Math.ceil(fit / o.xEvery) : fit;
  o.labels.forEach((lab, i) => {
    if (i % every !== 0 && i !== n - 1) return;
    if (i !== n - 1 && n - 1 - i < every * 0.7) return;
    sv('text', { x: X(i), y: H - 6, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'ax', text: lab }, svg);
  });
  (o.refs || []).forEach((r) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(r.v), y2: Y(r.v), class: 'ref-l' }, svg);
    if (r.label) sv('text', { x: m.l + 6, y: Y(r.v) - 5, class: 'lbl-muted', text: r.label }, svg);
  });
  series.forEach((s) => {
    const segs = []; let cur = [];
    s.values.forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([X(i), Y(v)]); });
    if (cur.length) segs.push(cur);
    segs.forEach((seg) => {
      if (s.area) { const b = Y(Math.max(sc.min, 0)); sv('path', { class: 'ar', d: `M${seg[0][0]},${b}L${seg.map((p) => p.join(',')).join('L')}L${seg[seg.length - 1][0]},${b}Z`, style: { fill: s.color, opacity: 0.12 } }, svg); }
      sv('path', { class: s.dash ? '' : 'ln', pathLength: s.dash ? null : 1, d: 'M' + seg.map((p) => p.map((c) => c.toFixed(1)).join(',')).join('L'), fill: 'none', style: { stroke: s.color, strokeWidth: s.width || 2, strokeLinejoin: 'round', strokeLinecap: 'round', strokeDasharray: s.dash ? '5 4' : null } }, svg);
    });
  });
  (o.notes || []).forEach((nt) => {
    const v = o.series[nt.s || 0].values[nt.i]; if (v == null) return;
    const x = X(nt.i), tw = textW(nt.label) + 8, tx = clamp(x - tw / 2, m.l, m.l + iw - tw);
    sv('line', { x1: x, x2: x, y1: Y(v) - 5, y2: m.t + 14, style: { stroke: 'var(--line-2)', strokeWidth: 1 } }, svg);
    sv('rect', { x: tx, y: m.t - 2, width: tw, height: 16, rx: 3, style: { fill: 'var(--surface)', stroke: 'var(--line-2)' } }, svg);
    sv('text', { x: tx + 4, y: m.t + 10, class: 'lbl-muted', text: nt.label }, svg);
  });
  if (o.endLabels !== false) {
    let lastY = -99;
    series.map((s) => { let i = s.values.length - 1; while (i >= 0 && s.values[i] == null) i--; return i < 0 ? null : { s, i, y: Y(s.values[i]) }; })
      .filter(Boolean).sort((a, b) => a.y - b.y).forEach((e) => {
        sv('circle', { class: 'dotm', cx: X(e.i), cy: e.y, r: 4, style: { fill: e.s.color, stroke: 'var(--surface)', strokeWidth: 2 } }, svg);
        if (e.s.noLabel || e.y - lastY < 14) return;
        lastY = e.y;
        sv('text', { class: 'lbl-strong dotm', x: X(e.i) + 8, y: e.y + 4, text: (e.s.fmt || o.yFmt)(e.s.values[e.i]) }, svg);
      });
  }
  const hover = sv('g', { style: { pointerEvents: 'none' } }, svg);
  const cross = sv('line', { y1: m.t, y2: m.t + ih, class: 'cross', visibility: 'hidden' }, hover);
  const dots = series.map((s) => sv('circle', { r: 4.5, visibility: 'hidden', style: { fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 } }, hover));
  explorer(svg, {
    x: m.l - 6, y: m.t, w: iw + 12, h: ih, n, xAt: X, onClick: o.onClick, label: o.hitLabel,
    show: (i, cx, cy) => {
      if (i < 0) { cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); return; }
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      series.forEach((s, si) => { const v = s.values[i]; dots[si].setAttribute('visibility', v == null ? 'hidden' : 'visible'); if (v != null) { dots[si].setAttribute('cx', X(i)); dots[si].setAttribute('cy', Y(v)); } });
      const rows = series.map((s) => ({ name: s.name, value: s.values[i] == null ? '—' : (s.fmt || o.yFmt)(s.values[i]), color: s.color }));
      Tip.show(cx, cy, tipNode(o.tipTitle ? o.tipTitle(i) : o.labels[i], rows.concat(o.tipExtra ? o.tipExtra(i) : [])));
    },
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- columnas (simples, apiladas o agrupadas) */
function drawCols(el, W, H, o) {
  const n = o.labels.length;
  const series = o.series.filter((s) => !(o.hidden && o.hidden.has(s.name)));
  const k = series.length;
  const mode = o.mode || (o.series.length > 1 ? 'stack' : 'single');
  const totals = o.labels.map((_, i) => sum(series, (s) => s.values[i] || 0));
  const hi = Math.max(1, ...(mode === 'stack' ? totals : series.flatMap((s) => s.values)), ...(o.refs || []).map((r) => r.v));
  const sc = niceScale(0, hi, H < 170 ? 4 : 5);
  const m = { t: 14, r: 6, b: 20, l: Math.max(26, ...sc.ticks.map((v) => textW(o.yFmt(v)))) + 8 };
  const iw = W - m.l - m.r, ih = Math.max(20, H - m.t - m.b), band = iw / n;
  const Y = (v) => m.t + ih - (v / sc.max) * ih;
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  sc.ticks.forEach((v) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v === 0 ? 'base-l' : 'grid-l' }, svg);
    sv('text', { x: m.l - 6, y: Y(v) + 3.5, 'text-anchor': 'end', class: 'ax', text: o.yFmt(v) }, svg);
  });
  const bw = mode === 'group' ? Math.max(3, Math.min(20, (band * 0.78 - 2 * (k - 1)) / Math.max(1, k))) : Math.max(3, Math.min(26, band * 0.66));
  const gw = mode === 'group' ? bw * k + 2 * (k - 1) : bw;
  const cx = (i) => m.l + i * band + band / 2;
  const every = o.xEvery || Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 36))));
  o.labels.forEach((lab, i) => { if (i % every === 0 || i === o.sel) sv('text', { x: cx(i), y: H - 5, 'text-anchor': 'middle', class: i === o.sel ? 'lbl' : 'ax', text: lab }, svg); });
  const hl = sv('rect', { y: m.t, height: ih, rx: 4, visibility: 'hidden', style: { fill: 'var(--ink)', opacity: 0.05, pointerEvents: 'none' } }, svg);
  for (let i = 0; i < n; i++) {
    const g = sv('g', { class: o.sel != null && o.sel >= 0 && i !== o.sel ? 'dim' : '' }, svg);
    if (mode === 'stack') {
      let base = Y(0); const nz = series.map((s, si) => (s.values[i] > 0 ? si : -1)).filter((v) => v >= 0);
      series.forEach((s, si) => {
        const v = s.values[i] || 0; if (v <= 0) return;
        const h0 = (v / sc.max) * ih, gap = si === nz[0] ? 0 : 1.5, y = base - h0;
        mark(g, barPath(cx(i) - bw / 2, y, bw, Math.max(0, h0 - gap), si === nz[nz.length - 1] ? 'up' : 'flat'), s.color, 'up');
        base = y;
      });
    } else if (mode === 'group') {
      series.forEach((s, si) => { const v = s.values[i] || 0; if (v > 0) mark(g, barPath(cx(i) - gw / 2 + si * (bw + 2), Y(v), bw, Y(0) - Y(v), 'up'), s.color); });
    } else {
      const v = (series[0] && series[0].values[i]) || 0;
      if (v > 0) mark(g, barPath(cx(i) - bw / 2, Y(v), bw, Y(0) - Y(v), 'up'), (o.colorAt && o.colorAt(i)) || series[0].color);
    }
    if (o.topLabels === 'all') { const v = mode === 'stack' ? totals[i] : Math.max(...series.map((s) => s.values[i] || 0)); sv('text', { x: cx(i), y: Y(v) - 4, 'text-anchor': 'middle', class: 'lbl-strong', text: (o.fmt || o.yFmt)(v) }, svg); }
  }
  (o.refs || []).forEach((r) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(r.v), y2: Y(r.v), class: 'ref-l' }, svg);
    if (r.label) sv('text', { x: m.l + iw, y: Y(r.v) - 5, 'text-anchor': 'end', class: 'lbl-muted', text: r.label }, svg);
  });
  explorer(svg, {
    x: m.l, y: m.t, w: iw, h: ih, n, xAt: cx, onClick: o.onClick, label: o.hitLabel,
    show: (i, x, y) => {
      if (i < 0) { hl.setAttribute('visibility', 'hidden'); return; }
      hl.setAttribute('x', m.l + i * band + 1); hl.setAttribute('width', Math.max(1, band - 2)); hl.setAttribute('visibility', 'visible');
      const rows = series.map((s) => ({ name: s.name, value: (o.fmt || o.yFmt)(s.values[i] || 0), color: (o.colorAt && k === 1 && o.colorAt(i)) || s.color, key: 'rect' }));
      if (mode === 'stack' && k > 1) rows.push({ name: 'Total', value: (o.fmt || o.yFmt)(totals[i]) });
      Tip.show(x, y, tipNode(o.tipTitle ? o.tipTitle(i) : o.labels[i], rows.concat(o.tipExtra ? o.tipExtra(i) : [])));
    },
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- barras horizontales */
function drawHBars(el, W, H, o) {
  const rows = o.rows, N = rows.length;
  // las filas y la letra se adaptan al recuadro: nunca se salen aunque el gráfico sea bajo o estrecho
  const rowH = Math.max(9, Math.min(34, (H - 2) / N)), thick = clamp(Math.round(rowH * 0.56), 4, 16);
  const fs = clamp(Math.round(rowH * 0.62), 8, 11), sty = { fontSize: fs + 'px' };
  const labelW = Math.min(Math.max(...rows.map((r) => textW(r.label, fs, 600))) + 10, W * 0.42);
  const valW = Math.max(...rows.map((r) => textW(o.fmt(r.value), fs, 700))) + 8;
  const iw = Math.max(20, W - labelW - valW);
  const max = o.max || Math.max(...rows.map((r) => Math.max(r.value, r.target || 0))) || 1;
  const X = (v) => labelW + (v / max) * iw;
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': o.onClick ? null : 'true' });
  sv('line', { x1: labelW, x2: labelW, y1: 0, y2: rowH * N, class: 'base-l' }, svg);
  rows.forEach((r, i) => {
    const y = i * rowH, cy = y + rowH / 2;
    const g = sv('g', { class: r.dim ? 'dim' : '' }, svg);
    let lab = r.label; while (textW(lab, fs, 600) > labelW - 8 && lab.length > 3) lab = lab.slice(0, -2) + '…';
    sv('text', { x: labelW - 7, y: cy + fs * 0.36, 'text-anchor': 'end', class: 'lbl', style: sty, text: lab }, g);
    const len = Math.max(0, X(r.value) - labelW);
    if (len > 0) mark(g, barPath(labelW, cy - thick / 2, len, thick, 'right'), r.color || 'var(--s1)', 'right');
    sv('text', { x: labelW + len + 5, y: cy + fs * 0.36, class: 'lbl-strong', style: sty, text: o.fmt(r.value) }, g);
    if (r.target) sv('line', { x1: X(r.target), x2: X(r.target), y1: cy - thick / 2 - 3, y2: cy + thick / 2 + 3, style: { stroke: 'var(--ink)', strokeWidth: 2 } }, g);
    const hit = sv('rect', { x: 0, y, width: W, height: rowH, class: 'hit' + (o.onClick ? ' clickable' : ''), tabindex: o.onClick ? 0 : null, role: o.onClick ? 'button' : null, 'aria-label': o.onClick ? `${r.label}: ${o.fmt(r.value)}. Filtrar` : null }, svg);
    const tip = (x, yy) => Tip.show(x, yy, tipNode(r.label, r.tip || [{ name: o.valueName || 'Valor', value: o.fmt(r.value), color: r.color || 'var(--s1)', key: 'rect' }].concat(r.target ? [{ name: r.targetLabel || 'Objetivo', value: o.fmt(r.target) }] : [])));
    hit.addEventListener('pointermove', (e) => tip(e.clientX, e.clientY));
    hit.addEventListener('pointerleave', () => Tip.hide());
    hit.addEventListener('focus', () => tip(...elXY(hit)));
    hit.addEventListener('blur', () => Tip.hide());
    if (o.onClick) {
      hit.addEventListener('click', () => o.onClick(r, i));
      hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(r, i); } });
    }
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- barras 100 % apiladas */
function drawStack100(el, W, H, o) {
  const N = o.rows.length, rowH = clamp(Math.floor((H - 2) / N), 18, 46), thick = clamp(Math.round(rowH * 0.64), 10, 26);
  const labelW = Math.min(Math.max(...o.rows.map((r) => textW(r.label, 11, 600))) + 10, W * 0.3);
  const iw = W - labelW - 2;
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  o.rows.forEach((r, ri) => {
    const tot = sum(r.parts) || 1; let x = labelW; const y = ri * rowH + (rowH - thick) / 2;
    sv('text', { x: labelW - 7, y: y + thick / 2 + 4, 'text-anchor': 'end', class: 'lbl', text: r.label }, svg);
    const nz = r.parts.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    r.parts.forEach((v, si) => {
      if (v <= 0) return;
      const w0 = (v / tot) * iw, last = si === nz[nz.length - 1], w = Math.max(0.5, w0 - (last ? 0 : 1.5)), s = o.series[si];
      mark(svg, last ? barPath(x, y, w, thick, 'right') : `M${x},${y}h${w}v${thick}h${-w}Z`, s.color, 'right');
      const txt = fmtPct(v / tot, 0);
      if (textW(txt, 11, 700) + 8 < w) sv('text', { x: x + w / 2, y: y + thick / 2 + 4, 'text-anchor': 'middle', style: { fill: s.ink || '#fff', fontSize: '11px', fontWeight: 700 }, text: txt }, svg);
      const hit = sv('rect', { x, y: y - 3, width: w, height: thick + 6, class: 'hit' }, svg);
      hit.addEventListener('pointermove', (e) => Tip.show(e.clientX, e.clientY, tipNode(r.label, [{ name: s.name, value: `${fmtPct(v / tot)} · ${o.fmtVal ? o.fmtVal(v) : fmtN(v)}`, color: s.color, key: 'rect' }])));
      hit.addEventListener('pointerleave', () => Tip.hide());
      x += w0;
    });
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- tornado (sensibilidad) */
function drawTornado(el, W, H, o) {
  const top = 5, N = o.rows.length, rowH = clamp(Math.floor((H - 18 - top) / N), 18, 34), thick = clamp(Math.floor((rowH - 4) / 2), 5, 11);
  // etiquetas: si no caben, letra algo menor y, en último caso, recortadas con «…» (no se salen del recuadro)
  const longest = Math.max(...o.rows.map((r) => textW(r.label, 11, 600)));
  // las cifras de los extremos siempre caben (sin tope); las etiquetas ceden el espacio que falte
  const tagW = Math.max(...o.rows.flatMap((r) => [r.lo, r.hi]).map((v) => textW((v >= 0 ? '+' : '') + o.fmt(v), 10))) + 8;
  const labelW = Math.max(54, Math.min(longest + 10, W * 0.34, W - tagW * 2 - 70)), lfs = clamp(Math.floor(11 * (labelW - 10) / longest * 10) / 10, 9, 11);
  const iw = Math.max(40, W - labelW - tagW * 2), c = labelW + tagW + iw / 2;
  const max = Math.max(...o.rows.flatMap((r) => [Math.abs(r.lo), Math.abs(r.hi)])) || 1;
  const X = (v) => c + (v / max) * (iw / 2);
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  sv('line', { x1: c, x2: c, y1: top, y2: top + rowH * N, class: 'base-l' }, svg);
  o.rows.forEach((r, i) => {
    const y = top + i * rowH;
    let lab = r.label; while (textW(lab, lfs, 600) > labelW - 9 && lab.length > 3) lab = lab.slice(0, -2) + '…';
    sv('text', { x: labelW - 7, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'lbl', style: { fontSize: lfs + 'px' }, text: lab }, svg);
    [[r.lo, y + rowH / 2 - thick - 1], [r.hi, y + rowH / 2 + 1]].forEach(([v, yy]) => {
      const w = Math.abs(X(v) - c);
      if (w > 0.5) mark(svg, barPath(Math.min(c, X(v)), yy, w, thick, v >= 0 ? 'right' : 'left'), v >= 0 ? 'var(--div-pos)' : 'var(--div-neg)', v >= 0 ? 'right' : 'left');
      sv('text', { x: v >= 0 ? X(v) + 4 : X(v) - 4, y: yy + thick - 1, 'text-anchor': v >= 0 ? 'start' : 'end', class: 'lbl-muted', style: { fontSize: '10px' }, text: (v >= 0 ? '+' : '') + o.fmt(v) }, svg);
    });
    const hit = sv('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, svg);
    hit.addEventListener('pointermove', (e) => Tip.show(e.clientX, e.clientY, tipNode(r.label, [
      { name: '−20 %', value: (r.lo >= 0 ? '+' : '') + o.fmt(r.lo), color: r.lo >= 0 ? 'var(--div-pos)' : 'var(--div-neg)', key: 'rect' },
      { name: '+20 %', value: (r.hi >= 0 ? '+' : '') + o.fmt(r.hi), color: r.hi >= 0 ? 'var(--div-pos)' : 'var(--div-neg)', key: 'rect' }])));
    hit.addEventListener('pointerleave', () => Tip.hide());
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- cascada (puente presupuesto → real)
   En columnas si los nombres caben debajo; si no, en filas (los nombres se leen enteros a la izquierda). */
function drawWaterfall(el, W, H, o) {
  const steps = o.steps; let run = 0; const bars = [];
  steps.forEach((s) => {
    if (s.total) { bars.push({ s, from: 0, to: s.value }); run = s.value; } else { bars.push({ s, from: run, to: run + s.value }); run += s.value; }
  });
  const ends = bars.flatMap((b) => (b.s.total ? [b.to] : [b.from, b.to]));
  const lo0 = Math.min(...ends), hi0 = Math.max(...ends), pad = (hi0 - lo0) * 0.35 || hi0 * 0.05;
  const color = (b) => (b.s.total ? 'var(--neutral-strong)' : b.s.value >= 0 ? 'var(--div-pos)' : 'var(--div-neg)');
  const label = (b) => (b.s.total ? o.fmtTotal(b.s.value) : (b.s.value >= 0 ? '+' : '') + o.fmt(b.s.value));
  const clickable = (b) => !!(o.onClick && !b.s.total);
  const wire = (hit, b) => {
    const tip = (cx, cy) => Tip.show(cx, cy, tipNode(b.s.label, b.s.total ? [{ name: 'Total', value: o.fmtTotal(b.s.value) }] : [{ name: 'Desviación', value: (b.s.value >= 0 ? '+' : '') + o.fmtTotal(b.s.value), color: color(b), key: 'rect' }].concat(b.s.extra || [])));
    hit.addEventListener('pointermove', (e) => tip(e.clientX, e.clientY));
    hit.addEventListener('pointerleave', () => Tip.hide());
    hit.addEventListener('focus', () => tip(...elXY(hit)));
    hit.addEventListener('blur', () => Tip.hide());
    if (clickable(b)) {
      hit.addEventListener('click', () => o.onClick(b.s));
      hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(b.s); } });
    }
  };
  const hitAttrs = (b, x, y, width, height) => ({ x, y, width, height, class: 'hit' + (clickable(b) ? ' clickable' : ''), tabindex: clickable(b) ? 0 : null, role: clickable(b) ? 'button' : null,
    'aria-label': `${b.s.label}: ${label(b)}` });
  const dim = (b) => (o.sel != null && o.sel >= 0 && b.s.idx !== o.sel && !b.s.total ? 'dim' : '');
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  const N = bars.length, longest = Math.max(...steps.map((s) => textW(s.label, 11, 600)));

  if (longest + 6 > (W - 40) / N) {
    // ---- en filas
    const tagW = Math.max(...bars.map((b) => textW(label(b), 11, 700))) + 10;
    const labelW = Math.min(longest + 12, W * 0.38);
    const iw = Math.max(30, W - labelW - tagW), axH = 16;
    const sc = niceScale(lo0 - pad, hi0 + pad * 0.6, iw < 160 ? 3 : 4);
    const rowH = clamp((H - axH - 4) / N, 14, 40), thick = clamp(Math.round(rowH * 0.58), 6, 20), top = 2;
    const X = (v) => labelW + ((clamp(v, sc.min, sc.max) - sc.min) / (sc.max - sc.min)) * iw;
    const tickW = Math.max(...sc.ticks.map((v) => textW(o.yFmt(v)))) + 8, tStep = Math.max(1, Math.ceil(sc.ticks.length / Math.max(2, Math.floor(iw / tickW))));
    sc.ticks.forEach((v, k) => {
      sv('line', { x1: X(v), x2: X(v), y1: top, y2: top + rowH * N, class: v === sc.min ? 'base-l' : 'grid-l' }, svg);
      if (k % tStep === 0) sv('text', { x: X(v), y: top + rowH * N + 12, 'text-anchor': k === 0 ? 'start' : 'middle', class: 'ax', text: o.yFmt(v) }, svg);
    });
    bars.forEach((b, i) => {
      const y = top + i * rowH, by = y + (rowH - thick) / 2;
      const x0 = b.s.total ? X(sc.min) : X(Math.min(b.from, b.to)), x1 = X(Math.max(b.from, b.to));
      const g = sv('g', { class: dim(b) }, svg);
      mark(g, barPath(x0, by, Math.max(1.5, x1 - x0), thick, b.s.total ? 'right' : 'flat', b.s.total ? 3 : 0), color(b), 'right');
      if (i < N - 1) sv('line', { x1: X(b.to), x2: X(b.to), y1: by + thick, y2: by + rowH, style: { stroke: 'var(--line-2)', strokeWidth: 1, strokeDasharray: '2 2' } }, svg);
      let nm = b.s.label; while (textW(nm, 11, 600) > labelW - 10 && nm.length > 3) nm = nm.slice(0, -2) + '…';
      sv('text', { x: labelW - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: b.s.total ? 'lbl-strong' : 'lbl', text: nm }, svg);
      sv('text', { x: x1 + 5, y: y + rowH / 2 + 4, class: 'lbl-strong', text: label(b) }, svg);
      wire(sv('rect', hitAttrs(b, 0, y, W, rowH), svg), b);
    });
    el.replaceChildren(svg);
    return;
  }

  // ---- en columnas
  const sc = niceScale(lo0 - pad, hi0 + pad * 0.6, H < 170 ? 4 : 5);
  const m = { t: 18, r: 6, b: 34, l: Math.max(30, ...sc.ticks.map((v) => textW(o.yFmt(v)))) + 8 };
  const iw = W - m.l - m.r, ih = Math.max(20, H - m.t - m.b), band = iw / N, bw = Math.min(46, band * 0.62);
  const Y = (v) => m.t + ih - ((clamp(v, sc.min, sc.max) - sc.min) / (sc.max - sc.min)) * ih;
  sc.ticks.forEach((v) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v === sc.min ? 'base-l' : 'grid-l' }, svg);
    sv('text', { x: m.l - 6, y: Y(v) + 3.5, 'text-anchor': 'end', class: 'ax', text: o.yFmt(v) }, svg);
  });
  bars.forEach((b, i) => {
    const x = m.l + i * band + (band - bw) / 2;
    const top = Y(Math.max(b.from, b.to)), bot = b.s.total ? Y(sc.min) : Y(Math.min(b.from, b.to));
    const g = sv('g', { class: dim(b) }, svg);
    mark(g, barPath(x, top, bw, Math.max(1.5, bot - top), b.s.total ? 'up' : 'flat', b.s.total ? 3 : 0), color(b), 'up');
    if (i < N - 1) sv('line', { x1: x + bw, x2: x + band, y1: Y(b.to), y2: Y(b.to), style: { stroke: 'var(--line-2)', strokeWidth: 1, strokeDasharray: '2 2' } }, svg);
    // en columnas estrechas la cifra se compacta y, si aun así no cabe, queda solo en la ventanita
    const lab = label(b); let shown = lab;
    if (textW(shown, 11, 700) > band - 4) shown = lab.replace(/\s?k€/, 'k').replace(/\s?M€/, 'M').replace(/\s?€/, '');
    if (textW(shown, 11, 700) <= band - 2) sv('text', { x: x + bw / 2, y: top - 5, 'text-anchor': 'middle', class: 'lbl-strong', text: shown }, svg);
    sv('text', { x: x + bw / 2, y: H - 18, 'text-anchor': 'middle', class: b.s.total ? 'lbl' : 'ax', text: b.s.label }, svg);
    wire(sv('rect', hitAttrs(b, m.l + i * band, m.t, band, ih + 20), svg), b);
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- mapa de España por comunidades (coropletas con relieve suave)
   Geometrías © Instituto Geográfico Nacional (IGN), CC BY 4.0, vía es-atlas (MIT); proyección cónica conforme
   con Canarias en recuadro (d3-composite-projections). Trazados ya proyectados por datos/generar_mapa.mjs. */
const SPAIN = /*__MAPA__*/ null;
const MAP_PREV = {};            // último color de cada comunidad, para fundir los colores al cambiar filtros
function rampColor(t) {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const a = dark ? [24, 79, 149] : [214, 230, 250], b = dark ? [183, 211, 246] : [16, 66, 129];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  return { fill: `rgb(${c.join(',')})`, ink: lum > 0.55 ? '#0f172a' : '#ffffff' };
}
function drawSpainMap(el, W, H, o) {
  const legendH = 20, key = o.key || 'map', prev = MAP_PREV[key] || (MAP_PREV[key] = {});
  const s = Math.min((W - 4) / SPAIN.w, (H - legendH - 2) / SPAIN.h), tx = (W - SPAIN.w * s) / 2, ty = 1;
  const byId = {}; o.items.forEach((it) => { byId[it.id] = it; });
  const itemOf = (rid) => byId[rid === 'CEU' || rid === 'MEL' ? 'CYM' : rid];
  const vals = o.items.map((it) => it.value), lo = Math.min(...vals), hi = Math.max(...vals);
  const colorOf = (v) => rampColor(hi > lo ? Math.pow((v - lo) / (hi - lo), 0.6) : 1);
  const sel = o.sel != null && o.sel >= 0 ? o.sel : -1;
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'spain' });
  const g = sv('g', { transform: `translate(${tx.toFixed(1)},${ty}) scale(${s.toFixed(4)})` }, svg);
  const land = SPAIN.regions.filter((r) => r.area > 10);
  // relieve: base desplazada hacia abajo (canto) y sombra suave
  const side = sv('g', { class: 'map-side', transform: 'translate(0,4)' }, g);
  land.forEach((r) => sv('path', { d: r.d }, side));
  if (SPAIN.frame) sv('path', { d: SPAIN.frame, class: 'map-frame', 'vector-effect': 'non-scaling-stroke' }, g);
  const top = sv('g', { class: 'map-top' }, g);
  const fills = [];
  const tip = (it, x, y) => Tip.show(x, y, tipNode(it.name, [{ name: o.valueName || 'Facturación', value: o.fmt(it.value), color: colorOf(it.value).fill, key: 'rect' }].concat(it.extra || [])));
  const wire = (node, it) => {
    node.addEventListener('pointermove', (e) => tip(it, e.clientX, e.clientY));
    node.addEventListener('pointerleave', () => Tip.hide());
    node.addEventListener('focus', () => tip(it, ...elXY(node)));
    node.addEventListener('blur', () => Tip.hide());
    if (o.onClick) {
      node.addEventListener('click', () => o.onClick(it));
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(it); } });
    }
  };
  // brillo superior que da volumen (dentro de cada comunidad, para que suba con ella al pasar el ratón)
  const defs = sv('defs', {}, svg), gid = 'sheen' + key;
  const lg = sv('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  sv('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': 0.24 }, lg); sv('stop', { offset: '.65', 'stop-color': '#ffffff', 'stop-opacity': 0 }, lg);
  land.forEach((r) => {
    const it = itemOf(r.id); if (!it) return;
    const c = colorOf(it.value).fill;
    const grp = sv('g', { class: 'rg mk mk-f' + (o.onClick ? ' clickable' : '') + (sel >= 0 && it.idx !== sel ? ' dim' : '') + (it.idx === sel ? ' on' : ''),
      tabindex: o.onClick ? 0 : null, role: o.onClick ? 'button' : 'img', 'aria-label': `${it.name}: ${o.fmt(it.value)}` }, top);
    const p = sv('path', { d: r.d, class: 'rg-fill', 'vector-effect': 'non-scaling-stroke' }, grp);
    sv('path', { d: r.d, class: 'rg-sheen', style: { fill: `url(#${gid})` } }, grp);
    p.style.fill = prev[r.id] || c; prev[r.id] = c; fills.push([p, c]);
    grp.addEventListener('pointerenter', () => { if (top.lastChild !== grp) top.appendChild(grp); });
    wire(grp, it);
  });
  // Ceuta y Melilla: círculos ampliados en su posición
  const cym = byId.CYM;
  if (cym) {
    SPAIN.regions.filter((r) => r.id === 'CEU' || r.id === 'MEL').forEach((r) => {
      const cx = tx + r.c[0] * s, cy = ty + r.c[1] * s, c = colorOf(cym.value).fill;
      const dot = sv('circle', { cx, cy, r: Math.max(5, 7 * Math.min(1, s * 1.2)), class: 'rg-dot mk mk-f' + (o.onClick ? ' clickable' : '') + (sel >= 0 && cym.idx !== sel ? ' dim' : '') + (cym.idx === sel ? ' on' : ''),
        tabindex: o.onClick ? 0 : null, role: o.onClick ? 'button' : 'img', 'aria-label': `${cym.name}: ${o.fmt(cym.value)}` }, svg);
      dot.style.fill = prev[r.id] || c; prev[r.id] = c; fills.push([dot, c]);
      wire(dot, cym);
      sv('text', { x: cx, y: cy + 17, 'text-anchor': 'middle', class: 'map-cap', text: r.id === 'CEU' ? 'Ceuta' : 'Melilla' }, svg);
    });
  }
  // valores sobre las comunidades con espacio suficiente
  // etiqueta solo si la comunidad ocupa suficiente superficie en pantalla
  const fs = Math.round(Math.max(10, Math.min(14, 7 + 6 * s)));
  land.filter((r) => r.area * s * s >= 1400 || (r.id === 'MAD' && s >= 0.75)).forEach((r) => {
    const it = itemOf(r.id); if (!it) return;
    const ink = colorOf(it.value).ink;
    sv('text', { x: tx + r.c[0] * s, y: ty + r.c[1] * s + fs * 0.36, 'text-anchor': 'middle', class: 'map-val' + (sel >= 0 && it.idx !== sel ? ' dim' : ''),
      style: { fontSize: fs + 'px', fill: ink, stroke: ink === '#ffffff' ? 'rgba(15,23,42,.35)' : 'rgba(255,255,255,.55)' }, text: o.fmtShort(it.value) }, svg);
  });
  // leyenda continua y fuente del mapa
  const ly = H - legendH + 6, lw = Math.min(150, W * 0.36), lx = W - lw - 4;
  const lgx = sv('linearGradient', { id: 'gmap' + key }, defs);
  [0, 0.5, 1].forEach((t) => sv('stop', { offset: t * 100 + '%', 'stop-color': rampColor(Math.pow(t, 0.6)).fill }, lgx));
  sv('rect', { x: lx, y: ly, width: lw, height: 7, rx: 3.5, style: { fill: `url(#gmap${key})` } }, svg);
  sv('text', { x: lx - 5, y: ly + 7, 'text-anchor': 'end', class: 'ax', text: o.fmtShort(lo) }, svg);
  sv('text', { x: lx + lw, y: ly - 3, 'text-anchor': 'end', class: 'ax', text: o.fmtShort(hi) }, svg);
  sv('text', { x: 2, y: H - 3, class: 'map-src', text: '© IGN' }, svg);
  el.replaceChildren(svg);
  // los colores se funden desde el estado anterior (al cambiar periodo, canal o línea)
  setTimeout(() => fills.forEach(([n, c]) => { n.style.fill = c; }), 30);
}

/* ---------------------------------------------------------------- medidor (gauge) */
function drawGauge(el, W, H, o) {
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });   // la descripción la lleva el recuadro
  const r = Math.max(30, Math.min(W / 2 - 40, H - 62)), cx = W / 2, cy = Math.min(H - 44, r + 18), thick = Math.max(10, r * 0.2);
  const max = o.max || 1;
  const pt = (f, rad) => { const a = Math.PI * (1 - clamp(f, 0, 1)); return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]; };
  const arc = (f0, f1, rad) => { const [x0, y0] = pt(f0, rad), [x1, y1] = pt(f1, rad); return `M${x0},${y0}A${rad},${rad} 0 0 1 ${x1},${y1}`; };
  const rr = r - thick / 2;
  sv('path', { d: arc(0, 1, rr), fill: 'none', style: { stroke: 'var(--surface-3)', strokeWidth: thick, strokeLinecap: 'round' } }, svg);
  const f = clamp(o.value / max, 0, 1);
  if (o.proj != null) { const fp = clamp(o.proj / max, 0, 1); if (fp > f) sv('path', { d: arc(f, fp, rr), fill: 'none', style: { stroke: o.color || 'var(--s1)', strokeWidth: thick, opacity: 0.25 } }, svg); }
  if (f > 0.002) sv('path', { class: 'ln', pathLength: 1, d: arc(0, f, rr), fill: 'none', style: { stroke: o.color || 'var(--s1)', strokeWidth: thick, strokeLinecap: 'round' } }, svg);
  (o.marks || []).forEach((mk) => {
    const fm = clamp(mk.v / max, 0, 1); const [x0, y0] = pt(fm, r + 4), [x1, y1] = pt(fm, r - thick - 4);
    sv('line', { x1: x0, y1: y0, x2: x1, y2: y1, style: { stroke: 'var(--ink)', strokeWidth: 2.5, strokeLinecap: 'round' } }, svg);
    const [lx, ly] = pt(fm, r + 14);
    sv('text', { x: lx, y: ly, 'text-anchor': fm > 0.6 ? 'start' : fm < 0.4 ? 'end' : 'middle', class: 'lbl-muted', text: mk.label }, svg);
  });
  sv('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', style: { fill: 'var(--ink)', fontSize: Math.max(20, Math.min(40, r * 0.42)) + 'px', fontWeight: 700, fontFamily: 'var(--font)' }, text: o.label }, svg);
  if (o.sub) sv('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'ax', style: { fontSize: '11.5px' }, text: o.sub }, svg);
  if (o.sub2) sv('text', { x: cx, y: cy + 30, 'text-anchor': 'middle', class: 'lbl', text: o.sub2 }, svg);
  sv('text', { x: cx - rr, y: cy + 16, 'text-anchor': 'middle', class: 'ax', text: o.minLabel || '0' }, svg);
  sv('text', { x: cx + rr, y: cy + 16, 'text-anchor': 'middle', class: 'ax', text: o.maxLabel || '' }, svg);
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- sparkline y medidor lineal */
function sparkSvg(values, { w = 200, h = 44, color = 'var(--brand)', dot = true } = {}) {
  const v = values.filter((x) => x != null); if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const X = (i) => 2 + (i * (w - 8)) / (values.length - 1), Y = (x) => h - 4 - ((x - lo) / span) * (h - 10);
  const d = values.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join('');
  const lx = X(values.length - 1), ly = Y(values[values.length - 1]);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true" style="display:block;overflow:visible">
    <path d="${d}L${lx},${h}L2,${h}Z" style="fill:${color};opacity:.12"/>
    <path d="${d}" fill="none" style="stroke:${color};stroke-width:2;stroke-linejoin:round" vector-effect="non-scaling-stroke"/>
    ${dot ? `<circle cx="${lx}" cy="${ly}" r="3.5" style="fill:${color};stroke:var(--surface);stroke-width:2"/>` : ''}</svg>`;
}
function meterHtml(frac, { cls = '', tick = null, label = '' } = {}) {
  const f = clamp(frac, 0, 1);
  return `<div class="meter ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(f * 100)}"${label ? ` aria-label="${esc(label)}"` : ''}><span style="width:${(f * 100).toFixed(1)}%"></span>${tick != null ? `<i class="tick" style="left:calc(${(clamp(tick, 0, 1) * 100).toFixed(1)}% - 1px)"></i>` : ''}</div>`;
}
