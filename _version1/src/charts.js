/* ===================================================================== charts.js
   Mini-librería de gráficos SVG accesibles (sin dependencias).
   - Marcas finas, extremos redondeados de 4px, huecos de 2px entre rellenos.
   - Tooltip al pasar el ratón y con teclado (flechas), vista de tabla y
     resumen en lectura fácil en cada tarjeta.
   - Texturas opcionales (45°/135°) para daltonismo e impresión. */

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
let _ctx;
function textW(str, size = 11.5, weight = 400) {
  _ctx = _ctx || document.createElement('canvas').getContext('2d');
  _ctx.font = `${weight} ${size}px "Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif`;
  return _ctx.measureText(String(str)).width;
}
function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range)); const f = range / Math.pow(10, exp);
  let nf;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}
function niceScale(min, max, ticks = 5) {
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (max === min) max = min + (Math.abs(min) || 1);
  const range = niceNum(max - min, false);
  const step = niceNum(range / (ticks - 1), true);
  const nmin = Math.floor(min / step) * step, nmax = Math.ceil(max / step) * step;
  const arr = [];
  for (let v = nmin; v <= nmax + step / 2; v += step) arr.push(+v.toFixed(10));
  return { min: nmin, max: nmax, step, ticks: arr };
}
/** Barra con extremo de datos redondeado (4px) y base recta. */
function barPath(x, y, w, h, dir = 'up', r = 4) {
  if (w <= 0 || h <= 0) return '';
  if (dir === 'up') { r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  if (dir === 'down') { r = Math.min(r, w / 2, h); return `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`; }
  if (dir === 'right') { r = Math.min(r, h / 2, w); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; }
  if (dir === 'left') { r = Math.min(r, h / 2, w); return `M${x + w},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w}Z`; }
  return `M${x},${y}h${w}v${h}h${-w}Z`;
}
function mark(parent, d, color, texIdx, extra = {}) {
  const p = sv('path', Object.assign({ d, class: 'mark', style: { fill: color } }, extra), parent);
  if (texIdx != null && texIdx >= 0) sv('path', { d, class: 'tex', style: { fill: `url(#tx${texIdx % 5})` } }, parent);
  return p;
}
function evtXY(e) { return [e.clientX, e.clientY]; }
function elXY(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + 10]; }

/* ---------------------------------------------------------------- tarjeta de gráfico */
function legendHtml(items) {
  return items.map((it) => `<span>${it.key === 'line'
    ? `<i class="line-key" style="background:${it.color}${it.dash ? ';background:repeating-linear-gradient(90deg,' + it.color + ' 0 5px,transparent 5px 8px)' : ''}"></i>`
    : `<i class="swatch" style="background:${it.color}"></i>`}${esc(it.name)}</span>`).join('');
}
function tableHtml(t) {
  const al = t.align || [];
  return `<table class="t"><thead><tr>${t.head.map((h, i) => `<th${al[i] === 'r' ? ' class="r"' : ''} scope="col">${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => `<td${al[i] === 'r' ? ' class="r"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function copyText(text, fallbackEl) {
  const done = () => toast('Copiado al portapapeles', 'Pega la tabla en Excel o en tu documento (separador: punto y coma).', 'copy');
  try {
    navigator.clipboard.writeText(text).then(done, () => selectEl(fallbackEl));
  } catch (e) { selectEl(fallbackEl); }
}
function selectEl(el) {
  if (!el) return;
  const r = document.createRange(); r.selectNodeContents(el);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  toast('Tabla seleccionada', 'Pulsa Ctrl+C para copiarla.', 'copy');
}
/**
 * Crea una tarjeta <figure> con título, leyenda, gráfico, vista de tabla y lectura fácil.
 * o = { title, sub, easy, legend, table:{head,rows,align}, draw(el, width), id, actions }
 */
function chartCard(o) {
  const fig = document.createElement('figure');
  fig.className = 'card chart-card'; fig.style.margin = '0';
  if (o.id) fig.id = o.id;
  fig.innerHTML = `<div class="card-head" style="margin-bottom:0"><div><h3></h3>${o.sub ? '<p class="card-sub"></p>' : ''}</div>
    <div class="card-actions">${o.actions || ''}${o.table ? `<button type="button" class="btn btn-ghost btn-sm" data-act="table" aria-pressed="false">${icon('table')}<span>Tabla</span></button>` : ''}</div></div>
    ${o.legend ? `<div class="legend">${legendHtml(o.legend)}</div>` : ''}
    <div class="chart" role="img"></div>
    ${o.table ? '<div class="chart-table" hidden></div>' : ''}
    ${o.easy ? `<figcaption class="easy">${icon('eye')}<span><b>En pocas palabras:</b> <span class="easy-t"></span></span></figcaption>` : ''}`;
  fig.querySelector('h3').textContent = o.title;
  if (o.sub) fig.querySelector('.card-sub').textContent = o.sub;
  if (o.easy) fig.querySelector('.easy-t').textContent = o.easy;
  const chart = fig.querySelector('.chart');
  chart.setAttribute('aria-label', `${o.title}. ${o.easy || o.sub || ''}`);
  if (o.table) {
    const tw = fig.querySelector('.chart-table');
    tw.innerHTML = `<div class="row" style="justify-content:flex-end;padding:6px 8px;border-bottom:1px solid var(--line)"><button type="button" class="btn btn-ghost btn-sm" data-act="copy">${icon('copy')}<span>Copiar CSV</span></button></div>${tableHtml(o.table)}`;
    fig.querySelector('[data-act="table"]').addEventListener('click', (e) => {
      const on = tw.hidden; tw.hidden = !on; chart.hidden = on;
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.querySelector('span').textContent = on ? 'Gráfico' : 'Tabla';
    });
    tw.querySelector('[data-act="copy"]').addEventListener('click', () => {
      const csv = [o.table.head].concat(o.table.rows).map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      copyText(csv, tw.querySelector('table'));
    });
  }
  let lastW = 0;
  const draw = () => {
    const w = Math.floor(chart.clientWidth);
    if (!w || w === lastW) return;
    lastW = w;
    try { o.draw(chart, w); } catch (err) { console.error(err); }
  };
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(draw)).observe(chart);
  else setTimeout(draw, 50);
  fig.redraw = () => { lastW = 0; draw(); };
  return fig;
}

/* ---------------------------------------------------------------- capa de exploración compartida */
function explorer(svg, { x, y, w, h, n, xAt, show, onClick, label }) {
  let cur = -1;
  const ov = sv('rect', { x, y, width: w, height: h, class: 'hit' + (onClick ? ' clickable' : ''), tabindex: 0, 'aria-label': label || 'Explorar valores: usa las flechas izquierda y derecha' + (onClick ? '; Intro para ver el detalle' : '') }, svg);
  const idxFromX = (clientX) => {
    const r = svg.getBoundingClientRect(); const sx = (clientX - r.left) * (svg.viewBox.baseVal.width / r.width);
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(xAt(i) - sx); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  ov.addEventListener('pointermove', (e) => { cur = idxFromX(e.clientX); show(cur, ...evtXY(e)); });
  ov.addEventListener('pointerleave', () => { show(-1); Tip.hide(); });
  ov.addEventListener('click', (e) => { if (onClick) { cur = idxFromX(e.clientX); onClick(cur); } });
  ov.addEventListener('focus', () => { if (cur < 0) cur = n - 1; const r = ov.getBoundingClientRect(); const sx = r.width / svg.viewBox.baseVal.width; show(cur, r.left + (xAt(cur) - x) * sx, r.top + 12); });
  ov.addEventListener('blur', () => { show(-1); Tip.hide(); });
  ov.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      cur = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1);
      const r = ov.getBoundingClientRect(); const sx = r.width / svg.viewBox.baseVal.width;
      show(cur, r.left + (xAt(cur) - x) * sx, r.top + 12);
    } else if ((e.key === 'Enter' || e.key === ' ') && onClick && cur >= 0) { e.preventDefault(); onClick(cur); }
  });
  return ov;
}

/* ---------------------------------------------------------------- líneas */
/** o = { labels, series:[{name,color,values,area,dash,fmt}], yFmt, h, refs:[{v,label}], notes:[{i,label}], onClick(i), tipTitle(i), zero, yMin, yMax, endLabels } */
function drawLine(el, W, o) {
  const H = o.h || 260, n = o.labels.length;
  const vals = o.series.flatMap((s) => s.values.filter((v) => v != null));
  (o.refs || []).forEach((r) => vals.push(r.v));
  let lo = o.yMin != null ? o.yMin : (o.zero === false ? Math.min(...vals) : Math.min(0, ...vals));
  let hi = o.yMax != null ? o.yMax : Math.max(...vals);
  if (o.zero === false && o.yMin == null) { const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad * 0.4; }
  const sc = niceScale(lo, hi, o.ticks || 5);
  const yLabW = Math.max(...sc.ticks.map((v) => textW(o.yFmt(v)))) + 14;
  const endW = o.endLabels === false ? 14 : Math.max(40, ...o.series.map((s) => textW((s.fmt || o.yFmt)(s.values[s.values.length - 1] || 0), 12, 700))) + 16;
  const m = { t: 14, r: endW, b: 28, l: Math.max(40, yLabW) };
  const iw = Math.max(40, W - m.l - m.r), ih = H - m.t - m.b;
  const X = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const Y = (v) => m.t + ih - ((v - sc.min) / (sc.max - sc.min)) * ih;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  sc.ticks.forEach((v) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v === 0 || v === sc.min ? 'base-l' : 'grid-l' }, svg);
    sv('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'ax', text: o.yFmt(v) }, svg);
  });
  const maxLabels = Math.max(2, Math.floor(iw / 54));
  const every = o.xEvery || Math.ceil(n / maxLabels);
  o.labels.forEach((lab, i) => {
    if (i % every !== 0 && i !== n - 1) return;
    if (i !== n - 1 && (n - 1 - i) < every * 0.6) return;
    sv('text', { x: X(i), y: H - 8, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'ax', text: lab }, svg);
  });
  (o.bands || []).forEach((b) => {
    sv('rect', { x: X(b.from) - 4, y: m.t, width: X(b.to) - X(b.from) + 8, height: ih, style: { fill: 'var(--surface-2)' } }, svg);
    if (b.label) sv('text', { x: X(b.from), y: m.t + 12, class: 'lbl-muted', text: b.label }, svg);
  });
  (o.refs || []).forEach((r) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(r.v), y2: Y(r.v), class: 'ref-l' }, svg);
    if (r.label) sv('text', { x: m.l + 6, y: Y(r.v) - 6, class: 'lbl-muted', text: r.label }, svg);
  });
  o.series.forEach((s) => {
    const pts = s.values.map((v, i) => (v == null ? null : [X(i), Y(v)]));
    const segs = []; let curSeg = [];
    pts.forEach((p) => { if (p) curSeg.push(p); else if (curSeg.length) { segs.push(curSeg); curSeg = []; } });
    if (curSeg.length) segs.push(curSeg);
    segs.forEach((seg) => {
      if (s.area) {
        const base = Y(Math.max(sc.min, 0));
        sv('path', { d: `M${seg[0][0]},${base}L${seg.map((p) => p.join(',')).join('L')}L${seg[seg.length - 1][0]},${base}Z`, style: { fill: s.color, opacity: 0.1 } }, svg);
      }
      sv('path', { d: 'M' + seg.map((p) => p.map((c) => c.toFixed(1)).join(',')).join('L'), fill: 'none', style: { stroke: s.color, strokeWidth: s.width || 2, strokeLinejoin: 'round', strokeLinecap: 'round', strokeDasharray: s.dash ? '6 4' : null } }, svg);
    });
  });
  (o.notes || []).forEach((nt) => {
    const s0 = o.series[nt.s || 0]; const v = s0.values[nt.i]; if (v == null) return;
    const x = X(nt.i), y = Y(v);
    sv('line', { x1: x, x2: x, y1: y - 6, y2: m.t + 4, style: { stroke: 'var(--line-2)', strokeWidth: 1 } }, svg);
    const tw = textW(nt.label, 11.5) + 10;
    const tx = clamp(x - tw / 2, m.l, m.l + iw - tw);
    sv('rect', { x: tx, y: m.t - 10, width: tw, height: 18, rx: 5, style: { fill: 'var(--surface)', stroke: 'var(--line-2)' } }, svg);
    sv('text', { x: tx + 5, y: m.t + 3, class: 'lbl-muted', text: nt.label }, svg);
  });
  // etiquetas finales (directas) con anti-colisión: si chocan, se deja la leyenda
  if (o.endLabels !== false) {
    const ends = o.series.map((s) => { let i = s.values.length - 1; while (i >= 0 && s.values[i] == null) i--; return i < 0 ? null : { s, i, y: Y(s.values[i]) }; }).filter(Boolean).sort((a, b) => a.y - b.y);
    let lastY = -99;
    ends.forEach((e) => {
      sv('circle', { cx: X(e.i), cy: e.y, r: 4.5, style: { fill: e.s.color, stroke: 'var(--surface)', strokeWidth: 2 } }, svg);
      if (e.y - lastY < 15 || e.s.noLabel) return;
      lastY = e.y;
      sv('text', { x: X(e.i) + 9, y: e.y + 4, class: 'lbl-strong', text: (e.s.fmt || o.yFmt)(e.s.values[e.i]) }, svg);
    });
  }
  // capa hover
  const hover = sv('g', { style: { pointerEvents: 'none' } }, svg);
  const cross = sv('line', { y1: m.t, y2: m.t + ih, class: 'cross', visibility: 'hidden' }, hover);
  const dots = o.series.map((s) => sv('circle', { r: 4.5, visibility: 'hidden', style: { fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 } }, hover));
  explorer(svg, {
    x: m.l - 8, y: m.t, w: iw + 16, h: ih, n, xAt: X, onClick: o.onClick,
    show: (i, cx, cy) => {
      if (i < 0) { cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); return; }
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      o.series.forEach((s, si) => { const v = s.values[i]; if (v == null) { dots[si].setAttribute('visibility', 'hidden'); return; } dots[si].setAttribute('cx', X(i)); dots[si].setAttribute('cy', Y(v)); dots[si].setAttribute('visibility', 'visible'); });
      const rows = o.series.map((s) => ({ name: s.name, value: s.values[i] == null ? '—' : (s.fmt || o.yFmt)(s.values[i]), color: s.color }));
      if (o.tipExtra) rows.push(...o.tipExtra(i));
      Tip.show(cx, cy, tipNode(o.tipTitle ? o.tipTitle(i) : o.labels[i], rows));
    },
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- columnas (simples, apiladas o agrupadas) */
/** o = { labels, series:[{name,color,values}], mode:'single'|'stack'|'group', yFmt, fmt, h, highlight, onClick(i), tipTitle(i), refs, topLabels:'none'|'highlight'|'all', tex } */
function drawCols(el, W, o) {
  const H = o.h || 240, n = o.labels.length, k = o.series.length;
  const mode = o.mode || (k > 1 ? 'stack' : 'single');
  const totals = o.labels.map((_, i) => sum(o.series, (s) => s.values[i] || 0));
  const hi = Math.max(...(mode === 'stack' ? totals : o.series.flatMap((s) => s.values)), ...(o.refs || []).map((r) => r.v));
  const sc = niceScale(0, hi || 1, 5);
  const yLabW = Math.max(...sc.ticks.map((v) => textW(o.yFmt(v)))) + 14;
  const m = { t: 20, r: 10, b: 28, l: Math.max(36, yLabW) };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, band = iw / n;
  const Y = (v) => m.t + ih - (v / sc.max) * ih;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  sc.ticks.forEach((v) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v === 0 ? 'base-l' : 'grid-l' }, svg);
    sv('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'ax', text: o.yFmt(v) }, svg);
  });
  const bw = mode === 'group' ? Math.max(3, Math.min(22, (band * 0.78 - 2 * (k - 1)) / k)) : Math.max(3, Math.min(24, band * 0.64));
  const groupW = mode === 'group' ? bw * k + 2 * (k - 1) : bw;
  const cx = (i) => m.l + i * band + band / 2;
  const maxLabels = Math.max(2, Math.floor(iw / 44));
  const every = o.xEvery || Math.ceil(n / maxLabels);
  o.labels.forEach((lab, i) => {
    if (i % every !== 0 && i !== o.highlight) return;
    sv('text', { x: cx(i), y: H - 8, 'text-anchor': 'middle', class: i === o.highlight ? 'lbl' : 'ax', text: lab }, svg);
  });
  const marks = sv('g', {}, svg);
  for (let i = 0; i < n; i++) {
    const dim = o.highlight != null && i !== o.highlight && o.dimOthers !== false;
    const g = sv('g', { class: dim ? 'dim' : '' }, marks);
    if (mode === 'stack') {
      let base = Y(0); const x = cx(i) - bw / 2;
      const nz = o.series.map((s, si) => (s.values[i] > 0 ? si : -1)).filter((v) => v >= 0);
      const top = nz[nz.length - 1];
      o.series.forEach((s, si) => {
        const v = s.values[i] || 0; if (v <= 0) return;
        const h0 = (v / sc.max) * ih; const gap = si === nz[0] ? 0 : 2;
        const y = base - h0; const hh = Math.max(0, h0 - gap);
        mark(g, barPath(x, y, bw, hh, si === top ? 'up' : 'flat'), s.color, si);
        base = y;
      });
    } else if (mode === 'group') {
      const x0 = cx(i) - groupW / 2;
      o.series.forEach((s, si) => {
        const v = s.values[i] || 0; if (v <= 0) return;
        const y = Y(v);
        mark(g, barPath(x0 + si * (bw + 2), y, bw, Y(0) - y, 'up'), s.color, si);
      });
    } else {
      const v = o.series[0].values[i] || 0; if (v <= 0) continue;
      const y = Y(v);
      mark(g, barPath(cx(i) - bw / 2, y, bw, Y(0) - y, 'up'), (o.colorAt && o.colorAt(i)) || o.series[0].color, null);
    }
    const showTop = o.topLabels === 'all' || (o.topLabels === 'highlight' && i === o.highlight);
    if (showTop) {
      const v = mode === 'stack' ? totals[i] : Math.max(...o.series.map((s) => s.values[i] || 0));
      sv('text', { x: cx(i), y: Y(v) - 6, 'text-anchor': 'middle', class: 'lbl-strong', text: (o.fmt || o.yFmt)(v) }, svg);
    }
  }
  (o.refs || []).forEach((r) => {
    sv('line', { x1: m.l, x2: m.l + iw, y1: Y(r.v), y2: Y(r.v), class: 'ref-l' }, svg);
    if (r.label) sv('text', { x: m.l + iw, y: Y(r.v) - 6, 'text-anchor': 'end', class: 'lbl-muted', text: r.label }, svg);
  });
  const hl = sv('rect', { y: m.t, height: ih, rx: 6, visibility: 'hidden', style: { fill: 'var(--ink)', opacity: 0.05, pointerEvents: 'none' } }, svg);
  svg.insertBefore(hl, marks);
  explorer(svg, {
    x: m.l, y: m.t, w: iw, h: ih, n, xAt: cx, onClick: o.onClick,
    show: (i, x, y) => {
      if (i < 0) { hl.setAttribute('visibility', 'hidden'); return; }
      hl.setAttribute('x', m.l + i * band + 1); hl.setAttribute('width', band - 2); hl.setAttribute('visibility', 'visible');
      const rows = o.series.map((s) => ({ name: s.name, value: (o.fmt || o.yFmt)(s.values[i] || 0), color: s.color, key: 'rect' }));
      if (mode === 'stack' && k > 1) rows.push({ name: 'Total', value: (o.fmt || o.yFmt)(totals[i]) });
      if (o.tipExtra) rows.push(...o.tipExtra(i));
      Tip.show(x, y, tipNode(o.tipTitle ? o.tipTitle(i) : o.labels[i], rows));
    },
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- barras horizontales */
/** o = { rows:[{label, value, color, target, targetLabel, tip, dim}], fmt, max, onClick(row,i), rowH, thick, labelW, ariaRow } */
function drawHBars(el, W, o) {
  const rowH = o.rowH || 34, thick = o.thick || 14;
  const labelW = o.labelW || Math.min(Math.max(...o.rows.map((r) => textW(r.label, 12, 700))) + 14, W * 0.42);
  const valW = Math.max(...o.rows.map((r) => textW(o.fmt(r.value), 12, 700))) + 14;
  const H = o.rows.length * rowH + 6;
  const iw = Math.max(30, W - labelW - valW);
  const max = o.max || Math.max(...o.rows.map((r) => Math.max(r.value, r.target || 0))) || 1;
  const X = (v) => labelW + (v / max) * iw;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': o.onClick ? null : 'true' });
  sv('line', { x1: labelW, x2: labelW, y1: 2, y2: H - 4, class: 'base-l' }, svg);
  o.rows.forEach((r, i) => {
    const y = i * rowH + 3, cy = y + rowH / 2;
    const g = sv('g', { class: r.dim ? 'dim' : '' }, svg);
    // etiqueta (truncada con elipsis si no cabe)
    let lab = r.label; while (textW(lab, 12, 700) > labelW - 12 && lab.length > 3) lab = lab.slice(0, -2) + '…';
    sv('text', { x: labelW - 10, y: cy + 4, 'text-anchor': 'end', class: 'lbl', text: lab }, g);
    const len = Math.max(0, X(r.value) - labelW);
    if (len > 0) mark(g, barPath(labelW, cy - thick / 2, len, thick, 'right'), r.color || 'var(--s1)', r.tex != null ? r.tex : null);
    sv('text', { x: labelW + len + 6, y: cy + 4, class: 'lbl-strong', text: o.fmt(r.value) }, g);
    if (r.target) {
      const tx = X(r.target);
      sv('line', { x1: tx, x2: tx, y1: cy - thick / 2 - 4, y2: cy + thick / 2 + 4, style: { stroke: 'var(--ink)', strokeWidth: 2, strokeLinecap: 'round' } }, g);
    }
    const hit = sv('rect', { x: 0, y, width: W, height: rowH, class: 'hit' + (o.onClick ? ' clickable' : ''), tabindex: o.onClick ? 0 : null, role: o.onClick ? 'button' : null, 'aria-label': o.onClick ? `${r.label}: ${o.fmt(r.value)}. ${o.ariaRow || 'Filtrar por este elemento'}` : null }, svg);
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
/** o = { rows:[{label, parts:[]}], series:[{name,color,ink}], rowH, thick, fmtPart } */
function drawStack100(el, W, o) {
  const rowH = o.rowH || 44, thick = o.thick || 22;
  const labelW = o.labelW || Math.min(Math.max(...o.rows.map((r) => textW(r.label, 12, 700))) + 14, W * 0.38);
  const iw = W - labelW - 4, H = o.rows.length * rowH + 4;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  o.rows.forEach((r, ri) => {
    const tot = sum(r.parts) || 1; let x = labelW; const y = ri * rowH + (rowH - thick) / 2;
    sv('text', { x: labelW - 10, y: y + thick / 2 + 4, 'text-anchor': 'end', class: 'lbl', text: r.label }, svg);
    const nz = r.parts.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    r.parts.forEach((v, si) => {
      if (v <= 0) return;
      const w0 = (v / tot) * iw; const gap = si === nz[nz.length - 1] ? 0 : 2; const w = Math.max(0.5, w0 - gap);
      const s = o.series[si];
      const first = si === nz[0], last = si === nz[nz.length - 1];
      const d = first && last ? barPath(x, y, w, thick, 'right') : last ? barPath(x, y, w, thick, 'right') : `M${x},${y}h${w}v${thick}h${-w}Z`;
      mark(svg, d, s.color, si);
      const txt = (o.fmtPart || ((p) => fmtPct(p, 0)))(v / tot, v);
      if (textW(txt, 12, 700) + 12 < w) sv('text', { x: x + w / 2, y: y + thick / 2 + 4, 'text-anchor': 'middle', style: { fill: s.ink || '#fff', fontSize: '12px', fontWeight: 700 }, text: txt }, svg);
      const hit = sv('rect', { x, y: y - 4, width: w, height: thick + 8, class: 'hit' }, svg);
      hit.addEventListener('pointermove', (e) => Tip.show(e.clientX, e.clientY, tipNode(r.label, [{ name: s.name, value: `${fmtPct(v / tot)} · ${o.fmtVal ? o.fmtVal(v) : fmtN(v)}`, color: s.color, key: 'rect' }])));
      hit.addEventListener('pointerleave', () => Tip.hide());
      x += w0;
    });
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- pirámide de población */
/** o = { bands:[], left:{name,color,values}, right:{name,color,values}, fmt } — bandas de abajo (joven) arriba (mayor) */
function drawPyramid(el, W, o) {
  const rowH = 30, thick = 18, mid = 58, n = o.bands.length;
  const H = n * rowH + 30;
  const half = (W - mid) / 2 - 36;
  const max = Math.max(...o.left.values, ...o.right.values) || 1;
  const cxL = (W - mid) / 2, cxR = cxL + mid;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  sv('text', { x: cxL - 4, y: 14, 'text-anchor': 'end', class: 'lbl', text: o.left.name }, svg);
  sv('text', { x: cxR + 4, y: 14, class: 'lbl', text: o.right.name }, svg);
  for (let b = 0; b < n; b++) {
    const row = n - 1 - b; const y = 24 + row * rowH + (rowH - thick) / 2;
    sv('text', { x: W / 2, y: y + thick / 2 + 4, 'text-anchor': 'middle', class: 'ax', text: o.bands[b] }, svg);
    const lv = o.left.values[b], rv = o.right.values[b];
    const lw = (lv / max) * half, rw = (rv / max) * half;
    if (lw > 0) mark(svg, barPath(cxL - lw, y, lw, thick, 'left'), o.left.color, 0);
    if (rw > 0) mark(svg, barPath(cxR, y, rw, thick, 'right'), o.right.color, 1);
    sv('text', { x: cxL - lw - 6, y: y + thick / 2 + 4, 'text-anchor': 'end', class: 'lbl-strong', text: o.fmt(lv) }, svg);
    sv('text', { x: cxR + rw + 6, y: y + thick / 2 + 4, class: 'lbl-strong', text: o.fmt(rv) }, svg);
    const hit = sv('rect', { x: 0, y: y - 6, width: W, height: thick + 12, class: 'hit' }, svg);
    hit.addEventListener('pointermove', (e) => Tip.show(e.clientX, e.clientY, tipNode(`Edad ${o.bands[b]}`, [
      { name: o.left.name, value: o.fmt(lv), color: o.left.color, key: 'rect' }, { name: o.right.name, value: o.fmt(rv), color: o.right.color, key: 'rect' }])));
    hit.addEventListener('pointerleave', () => Tip.hide());
  }
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- tornado (sensibilidad) */
/** o = { rows:[{label, lo, hi}], fmt } — lo/hi: variación del resultado al mover la variable −/+ */
function drawTornado(el, W, o) {
  const rowH = 34, thick = 12;
  const labelW = Math.min(Math.max(...o.rows.map((r) => textW(r.label, 12, 700))) + 14, W * 0.36);
  const tagW = Math.max(...o.rows.flatMap((r) => [r.lo, r.hi]).map((v) => textW(`+20 %: ${(v >= 0 ? '+' : '') + o.fmt(v)}`, 10.5))) + 10;
  const pad = Math.min(tagW, W * 0.2); const iw = Math.max(40, W - labelW - pad * 2); const c = labelW + pad + iw / 2;
  const max = Math.max(...o.rows.flatMap((r) => [Math.abs(r.lo), Math.abs(r.hi)])) || 1;
  const X = (v) => c + (v / max) * (iw / 2);
  const H = o.rows.length * rowH + 26;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  sv('line', { x1: c, x2: c, y1: 2, y2: H - 22, class: 'base-l' }, svg);
  sv('text', { x: c, y: H - 6, 'text-anchor': 'middle', class: 'ax', text: 'Escenario actual' }, svg);
  o.rows.forEach((r, i) => {
    const y = i * rowH + 4;
    sv('text', { x: labelW - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'lbl', text: r.label }, svg);
    [['lo', r.lo, y + rowH / 2 - thick - 1, '−20 %'], ['hi', r.hi, y + rowH / 2 + 1, '+20 %']].forEach(([k, v, yy, tag]) => {
      const color = v >= 0 ? 'var(--div-pos)' : 'var(--div-neg)';
      const x0 = Math.min(c, X(v)), w = Math.abs(X(v) - c);
      if (w > 0.5) mark(svg, barPath(x0, yy, w, thick, v >= 0 ? 'right' : 'left'), color, (v >= 0 ? 0 : 1));
      const tx = v >= 0 ? X(v) + 5 : X(v) - 5;
      sv('text', { x: tx, y: yy + thick - 2, 'text-anchor': v >= 0 ? 'start' : 'end', class: 'lbl-muted', style: { fontSize: '10.5px' }, text: `${tag}: ${(v >= 0 ? '+' : '') + o.fmt(v)}` }, svg);
      void k;
    });
    const hit = sv('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, svg);
    hit.addEventListener('pointermove', (e) => Tip.show(e.clientX, e.clientY, tipNode(r.label, [
      { name: 'Si baja un 20 %', value: (r.lo >= 0 ? '+' : '') + o.fmt(r.lo), color: r.lo >= 0 ? 'var(--div-pos)' : 'var(--div-neg)', key: 'rect' },
      { name: 'Si sube un 20 %', value: (r.hi >= 0 ? '+' : '') + o.fmt(r.hi), color: r.hi >= 0 ? 'var(--div-pos)' : 'var(--div-neg)', key: 'rect' }])));
    hit.addEventListener('pointerleave', () => Tip.hide());
  });
  el.replaceChildren(svg);
}

/* ---------------------------------------------------------------- sparkline y medidor (HTML) */
function sparkSvg(values, { w = 160, h = 30, color = 'var(--brand)' } = {}) {
  const v = values.filter((x) => x != null); if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const X = (i) => 2 + (i * (w - 8)) / (values.length - 1), Y = (x) => h - 4 - ((x - lo) / span) * (h - 8);
  const d = values.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join('');
  const lx = X(values.length - 1), ly = Y(values[values.length - 1]);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true" style="display:block;overflow:visible">
    <path d="${d}L${lx},${h}L2,${h}Z" style="fill:${color};opacity:.1"/>
    <path d="${d}" fill="none" style="stroke:${color};stroke-width:2;stroke-linejoin:round;stroke-linecap:round" vector-effect="non-scaling-stroke"/>
    <circle cx="${lx}" cy="${ly}" r="3.5" style="fill:${color};stroke:var(--surface);stroke-width:2"/></svg>`;
}
function meterHtml(frac, { cls = '', tick = null, label = '' } = {}) {
  const f = clamp(frac, 0, 1);
  return `<div class="meter ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(f * 100)}"${label ? ` aria-label="${esc(label)}"` : ''}><span style="width:${(f * 100).toFixed(1)}%"></span>${tick != null ? `<i class="tick" style="left:calc(${(clamp(tick, 0, 1) * 100).toFixed(1)}% - 1px)"></i>` : ''}</div>`;
}
