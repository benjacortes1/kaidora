/* ===================================================================== view_dss.js
   DSS · simuladores «¿qué pasaría si…?»: lanzamiento de un kit nuevo y capacidad del Q4. */

FICHAS.dss = {
  pregunta: '¿Qué pasaría si…?',
  datos: 'Datos del MIS, datos externos (INE, mercado) y supuestos que introduce quien decide',
  nivel: 'Decisional (táctico-estratégico) · decisiones semiestructuradas y puntuales',
  usuarios: 'Analistas, dirección de operaciones y dirección comercial',
  frecuencia: 'A demanda, cuando hay que tomar una decisión',
  formato: 'Simulador de escenarios con análisis de sensibilidad',
  ejemplos: 'Calculadora de ingresos de Amazon FBA · programa maestro de producción (MPS) de Odoo · parámetros «what-if» de Power BI',
};

/* ---------------------------------------------------------------- modelo 1: nuevo kit */
// el coste unitario se separa en coste del kit + etiquetado braille y guía en audio (QR/NFC); la suma es la misma de siempre
const KIT_BASE = { price: 44, cost: 16.9, braille: 0.6, market: 1400, pen: 0.45, growth: 35, invest: 68, subsidy: 20, mkt: 24, farm: 35 };
const KIT_SCEN = {
  pes: { label: 'Pesimista', p: { price: 38, cost: 18.6, braille: 0.9, market: 1000, pen: 0.25, growth: 15, invest: 80, subsidy: 0, mkt: 30, farm: 45 } },
  base: { label: 'Base', p: KIT_BASE },
  opt: { label: 'Optimista', p: { price: 46, cost: 16.05, braille: 0.45, market: 1800, pen: 0.7, growth: 50, invest: 60, subsidy: 35, mkt: 22, farm: 30 } },
};
const KIT_SLIDERS = [
  { k: 'price', label: 'Precio de venta', min: 30, max: 60, step: 1, fmt: (v) => `${v} €` },
  { k: 'cost', label: 'Coste unitario', min: 12, max: 26, step: 0.05, fmt: (v) => `${dec(v, 2)} €` },
  { k: 'braille', label: 'Braille y guía en audio', min: 0, max: 2, step: 0.05, fmt: (v) => `${dec(v, 2)} €/kit` },
  { k: 'market', label: 'Mercado objetivo', min: 500, max: 3000, step: 50, fmt: (v) => `${fmtN(v)} mil hogares` },
  { k: 'pen', label: 'Penetración año 1', min: 0.1, max: 1.5, step: 0.05, fmt: (v) => `${dec(v, 2)} %` },
  { k: 'growth', label: 'Crecimiento anual', min: 0, max: 80, step: 5, fmt: (v) => `${v} %` },
  { k: 'invest', label: 'Inversión inicial', min: 20, max: 150, step: 2, fmt: (v) => `${v} k€` },
  { k: 'subsidy', label: 'Subvención', min: 0, max: 50, step: 5, fmt: (v) => `${v} %` },
  { k: 'mkt', label: 'Marketing anual', min: 5, max: 80, step: 1, fmt: (v) => `${v} k€` },
  { k: 'farm', label: 'Venta en farmacias', min: 0, max: 70, step: 5, fmt: (v) => `${v} %` },
];
const KIT_LABELS = { price: 'Precio', cost: 'Coste unitario', braille: 'Braille y audio', market: 'Mercado', pen: 'Penetración', growth: 'Crecimiento', invest: 'Inversión', mkt: 'Marketing', farm: 'Farmacias' };
function kitModel(p) {
  const direct = 1 - p.farm / 100;
  const netPrice = direct * p.price * 0.81 + (1 - direct) * p.price * 0.63 * 0.96;
  const unitC = netPrice - p.cost - (p.braille || 0) - (direct * 2.5 + (1 - direct) * 0.9);
  const y1 = (p.market * 1000 * p.pen) / 100;
  const yearly = [y1, y1 * (1 + p.growth / 100), y1 * Math.pow(1 + p.growth / 100, 2)];
  const ramp = [0.4, 0.4, 0.4, 0.7, 0.7, 0.7, 1, 1, 1, 1, 1, 1];
  const mu = range(0, 35).map((m) => (yearly[Math.floor(m / 12)] / 12) * (m < 12 ? ramp[m] : 1));
  const inv = p.invest * 1000 * (1 - p.subsidy / 100), mk = (p.mkt * 1000) / 12, r = Math.pow(1.08, 1 / 12) - 1;
  let cum = -inv, npv = -inv, payback = null; const cumS = [cum];
  mu.forEach((u, m) => { const cf = u * unitC - mk; cum += cf; npv += cf / Math.pow(1 + r, m + 1); cumS.push(cum); if (payback == null && cum >= 0) payback = m + 1; });
  return { netPrice, unitC, npv, payback, cumS, y1u: sum(mu.slice(0, 12)), units3: sum(mu), be: unitC > 0 ? (p.mkt * 1000 + inv / 3) / unitC : Infinity };
}
function kitTornado(p) {
  const base = kitModel(p).npv;
  return Object.keys(KIT_LABELS).map((k) => {
    const lo = kitModel(Object.assign({}, p, { [k]: p[k] * 0.8 })).npv - base, hi = kitModel(Object.assign({}, p, { [k]: p[k] * 1.2 })).npv - base;
    return { label: KIT_LABELS[k], lo, hi, span: Math.max(Math.abs(lo), Math.abs(hi)) };
  }).sort((a, b) => b.span - a.span);
}
const kitVerdict = (r) => (r.npv > 0 && r.payback && r.payback <= 24 ? ['good', 'Lanzar'] : r.npv > 0 ? ['warn', 'Piloto'] : ['crit', 'No lanzar']);

/* ---------------------------------------------------------------- modelo 2: capacidad Q4 */
const CAP_BASE = { growth: 16, pat: 2, rib: 1, oee: 81, temps: 8, overtime: 0, stock: 8 };
const CAP_SLIDERS = [
  { k: 'growth', label: 'Demanda vs Q4 2025', min: 0, max: 40, step: 1, fmt: (v) => `+${v} %` },
  { k: 'pat', label: 'Turnos Paterna', min: 1, max: 3, step: 1, fmt: (v) => `${v}` },
  { k: 'rib', label: 'Turnos Riba-roja', min: 1, max: 3, step: 1, fmt: (v) => `${v}` },
  { k: 'oee', label: 'OEE Riba-roja', min: 70, max: 90, step: 1, fmt: (v) => `${v} %` },
  { k: 'temps', label: 'Personal temporal', min: 0, max: 40, step: 1, fmt: (v) => `${v}` },
  { k: 'overtime', label: 'Horas extra', min: 0, max: 15, step: 1, fmt: (v) => `${v} %` },
  { k: 'stock', label: 'Stock a 1 de octubre', min: 0, max: 40, step: 1, fmt: (v) => `${v} mil kits` },
];
const Q4_WEEKS = ['1 oct', '8 oct', '15 oct', '22 oct', '29 oct', '5 nov', '12 nov', '19 nov', '26 nov', '3 dic', '10 dic', '17 dic', '24 dic'];
const Q4_W = [0.066, 0.068, 0.070, 0.072, 0.075, 0.079, 0.084, 0.094, 0.110, 0.097, 0.085, 0.062, 0.038];
const Q4_2025 = sum(D.production.filter((p) => p[0] >= T('2025-10') && p[0] <= T('2025-12')), (p) => p[3]);
function capModel(p) {
  const demand = Q4_2025 * (1 + p.growth / 100), weeks = Q4_W.map((w) => demand * w);
  const avg = (Q4_2025 * 1.16) / 13;   // capacidad calibrada: 2 turnos en Paterna + 1 en Riba-roja ≈ semana media prevista
  const cap = (p.pat * avg * 0.42 + p.rib * avg * 0.16 * (p.oee / 81) + p.temps * avg * 0.0115) * (1 + p.overtime / 100);
  let stock = p.stock * 1000, short = 0, weeksShort = 0; const stockS = [];
  weeks.forEach((d) => { stock += cap - d; if (stock < 0) { short += -stock; weeksShort++; stock = 0; } stockS.push(stock); });
  const cost = ((p.pat - 2) * 9800 + (p.rib - 1) * 4600 + p.temps * 560 + 42000 * (p.overtime / 100) * 1.25) * 13;
  void avg;
  return { weeks, cap, stockS, short, weeksShort, service: 1 - short / demand, cost, lost: short * 9.3 };
}

/* ---------------------------------------------------------------- vista */
const DSS_STATE = { kit: Object.assign({}, KIT_BASE), scen: 'base', cap: Object.assign({}, CAP_BASE) };
const slHtml = (s, v, pre) => `<div class="sl"><div class="sl-top"><label for="${pre}-${s.k}">${s.label}</label><output id="${pre}-${s.k}-o" for="${pre}-${s.k}">${s.fmt(v)}</output></div><input type="range" id="${pre}-${s.k}" data-k="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}" aria-valuetext="${esc(s.fmt(v))}"></div>`;

RENDER.dss = function () {
  const seg = `<div class="seg" role="tablist" aria-label="Escenario"><button type="button" role="tab" data-dss="kit" aria-selected="${S.dss === 'kit'}">Nuevo kit</button><button type="button" role="tab" data-dss="cap" aria-selected="${S.dss === 'cap'}">Capacidad Q4</button></div>`;
  const el = mount('view-dss', `<div class="report dss">
    ${reportHead('dss', 'Apoyo a la decisión', seg)}
    <div class="dss-body" id="dss-body"></div></div>`);
  $$('[data-dss]', el).forEach((b) => b.addEventListener('click', () => { S.dss = b.dataset.dss; RENDER.dss(); $(`[data-dss="${S.dss}"]`).focus(); }));
  if (S.dss === 'kit') dssKit($('#dss-body')); else dssCap($('#dss-body'));
};

function dssKit(body) {
  body.innerHTML = `
    <section class="tile" aria-label="Supuestos" id="kit-in">
      <div class="tile-h"><h3>Supuestos · Kit Accesible</h3></div>
      <div class="seg" role="group" aria-label="Escenarios">${Object.entries(KIT_SCEN).map(([k, s]) => `<button type="button" data-scen="${k}" aria-pressed="${DSS_STATE.scen === k}">${s.label}</button>`).join('')}</div>
      <div class="sliders">${KIT_SLIDERS.map((s) => slHtml(s, DSS_STATE.kit[s.k], 'kit')).join('')}</div>
    </section>
    <div class="dss-main">
      <div class="kpis" id="kit-kpis"></div>
      <div class="dss-charts"><div data-slot="cash"></div><div data-slot="tor"></div></div>
      <section class="tile" aria-label="Escenarios"><div class="tile-h"><h3>Comparación de escenarios</h3></div><div class="tbl"><table class="t dense"><thead><tr><th>Escenario</th><th class="r">Kits año 1</th><th class="r">Margen / kit</th><th class="r">VAN 3 años</th><th class="r">Recuperación</th><th>Decisión</th></tr></thead><tbody id="kit-scen"></tbody></table></div></section>
    </div>`;
  const cash = put(body, 'cash', tile({
    title: 'Caja acumulada (36 meses)',
    listen: () => { const r = kitModel(DSS_STATE.kit); return { values: r.cumS, summary: `Con los supuestos actuales, el VAN a tres años es ${(r.npv >= 0 ? 'más ' : 'menos ') + fmtEur(Math.abs(r.npv))} y ${r.payback ? `la inversión se recupera en el mes ${r.payback}` : 'la inversión no se recupera en tres años'}. La caja empieza en ${fmtEur(r.cumS[0])} y termina en ${fmtEur(r.cumS[r.cumS.length - 1])}. El coste del braille y la guía en audio es de ${dec(DSS_STATE.kit.braille, 2)} euros por kit.` }; },
    draw: (c, w, h) => {
      const r = kitModel(DSS_STATE.kit);
      drawLine(c, w, h, { labels: range(0, 36).map((m) => (m ? `M${m}` : 'Inicio')), yFmt: eurAxis, xEvery: 6, series: [{ name: 'Caja acumulada', color: 'var(--s1)', values: r.cumS, area: true, fmt: (v) => fmtEur(v) }], refs: [{ v: 0 }], notes: r.payback ? [{ i: r.payback, label: `Mes ${r.payback}` }] : [], tipTitle: (i) => (i ? `Mes ${i}` : 'Inicio') });
    },
  }));
  const tor = put(body, 'tor', tile({
    title: 'Sensibilidad del VAN (±20 %)',
    listen: () => { const t = kitTornado(DSS_STATE.kit); return { values: t.map((x) => x.span), summary: `Si cada variable cambia un 20 por ciento, la que más mueve el VAN es ${t[0].label}, hasta ${fmtEur(t[0].span)}; le siguen ${t[1].label} y ${t[2].label}. La que menos influye es ${t[t.length - 1].label}.` }; },
    legend: [{ name: 'Sube', color: 'var(--div-pos)' }, { name: 'Baja', color: 'var(--div-neg)' }],
    draw: (c, w, h) => drawTornado(c, w, h, { rows: kitTornado(DSS_STATE.kit), fmt: (v) => (Math.abs(v) < 1e4 ? dec(v / 1e3, 1) + ' k€' : fmtEur(v)) }),   // todo en k€ (misma unidad en todas las filas)
  }));
  const update = () => {
    const r = kitModel(DSS_STATE.kit), [lvl, txt] = kitVerdict(r);
    $('#kit-kpis').innerHTML = [
      kpiHtml({ l: 'VAN a 3 años', v: (r.npv >= 0 ? '+' : '') + fmtEur(r.npv), d: statusChip(lvl, txt) }),
      kpiHtml({ l: 'Recuperación', v: r.payback ? String(r.payback) : '> 36', u: ' meses' }),
      kpiHtml({ l: 'Kits año 1', v: fmtN(r.y1u) }),
      kpiHtml({ l: 'Margen por kit', v: dec(r.unitC, 2), u: ' €' }),
      kpiHtml({ l: 'Punto de equilibrio', v: isFinite(r.be) ? fmtN(r.be) : '—', u: ' kits/año' }),
    ].join('');
    $('#kit-scen').innerHTML = Object.values(KIT_SCEN).map((s) => [s.label, s.p]).concat([['Actual', DSS_STATE.kit]]).map(([lab, pp]) => {
      const x = kitModel(pp), [lv, tx] = kitVerdict(x);
      return `<tr${lab === 'Actual' ? ' style="font-weight:700"' : ''}><td>${lab}</td><td class="r">${fmtN(x.y1u)}</td><td class="r">${dec(x.unitC, 2)} €</td><td class="r">${(x.npv >= 0 ? '+' : '') + fmtEur(x.npv)}</td><td class="r">${x.payback ? x.payback + ' meses' : '> 36 meses'}</td><td>${statusChip(lv, tx)}</td></tr>`;
    }).join('');
    cash.redraw(); tor.redraw();
  };
  $$('#kit-in input[type="range"]').forEach((inp) => inp.addEventListener('input', () => {
    const s = KIT_SLIDERS.find((x) => x.k === inp.dataset.k); DSS_STATE.kit[s.k] = +inp.value; DSS_STATE.scen = '';
    $(`#kit-${s.k}-o`).textContent = s.fmt(+inp.value); inp.setAttribute('aria-valuetext', s.fmt(+inp.value));
    $$('[data-scen]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    update();
  }));
  $$('[data-scen]', body).forEach((b) => b.addEventListener('click', () => {
    DSS_STATE.scen = b.dataset.scen; DSS_STATE.kit = Object.assign({}, KIT_SCEN[b.dataset.scen].p);
    KIT_SLIDERS.forEach((s) => { const i = $(`#kit-${s.k}`); i.value = DSS_STATE.kit[s.k]; $(`#kit-${s.k}-o`).textContent = s.fmt(DSS_STATE.kit[s.k]); i.setAttribute('aria-valuetext', s.fmt(DSS_STATE.kit[s.k])); });
    $$('[data-scen]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  }));
  update();
}

function dssCap(body) {
  body.innerHTML = `
    <section class="tile" aria-label="Supuestos" id="cap-in">
      <div class="tile-h"><h3>Supuestos · campaña oct–dic</h3><button type="button" class="clear-btn" id="cap-reset" style="height:24px">Restablecer</button></div>
      <div class="sliders">${CAP_SLIDERS.map((s) => slHtml(s, DSS_STATE.cap[s.k], 'cap')).join('')}</div>
    </section>
    <div class="dss-main" style="grid-template-rows:auto minmax(0,1fr)">
      <div class="kpis" id="cap-kpis"></div>
      <div class="dss-charts"><div data-slot="weeks"></div><div data-slot="stock"></div></div>
    </div>`;
  const wk = put(body, 'weeks', tile({
    title: 'Kits a montar por semana vs capacidad',
    listen: () => { const r = capModel(DSS_STATE.cap), over = r.weeks.filter((v) => v > r.cap).length; return { values: r.weeks, summary: `La capacidad es de ${fmtN(r.cap)} kits por semana. ${over ? `En ${over} de las 13 semanas la demanda la supera.` : 'Ninguna semana supera la capacidad.'} Nivel de servicio: ${fmtPct(r.service)}.` }; },
    legend: [{ name: 'Dentro de capacidad', color: 'var(--s1)' }, { name: 'Por encima', color: 'var(--s2)' }],
    draw: (c, w, h) => {
      const r = capModel(DSS_STATE.cap);
      drawCols(c, w, h, { labels: Q4_WEEKS, yFmt: (v) => dec(v / 1000, 0) + ' k', fmt: fmtN, series: [{ name: 'Kits', color: 'var(--s1)', values: r.weeks }], colorAt: (i) => (r.weeks[i] > r.cap ? 'var(--s2)' : 'var(--s1)'), refs: [{ v: r.cap, label: `Capacidad ${fmtN(r.cap)}` }], tipTitle: (i) => `Semana del ${Q4_WEEKS[i]}`, tipExtra: (i) => [{ name: 'Capacidad', value: fmtN(r.cap) }] });
    },
  }));
  const st = put(body, 'stock', tile({
    title: 'Stock de kits al cierre de cada semana',
    listen: () => { const r = capModel(DSS_STATE.cap); return { values: r.stockS, summary: sumSeries(Q4_WEEKS.map((x) => 'la semana del ' + x), r.stockS, (v) => fmtN(v) + ' kits') }; },
    draw: (c, w, h) => {
      const r = capModel(DSS_STATE.cap);
      drawLine(c, w, h, { labels: Q4_WEEKS, yFmt: (v) => dec(v / 1000, 0) + ' k', series: [{ name: 'Stock', color: 'var(--s1)', values: r.stockS, area: true, fmt: fmtN }], tipTitle: (i) => `Semana del ${Q4_WEEKS[i]}` });
    },
  }));
  const update = () => {
    const r = capModel(DSS_STATE.cap), lvl = r.service >= 0.995 ? 'good' : r.service >= 0.97 ? 'warn' : 'crit';
    $('#cap-kpis').innerHTML = [
      kpiHtml({ l: 'Nivel de servicio', v: fmtPct(r.service), d: statusChip(lvl, lvl === 'good' ? 'Viable' : lvl === 'warn' ? 'Ajustado' : 'Insuficiente') }),
      kpiHtml({ l: 'Kits no servidos', v: fmtN(r.short), d: `<span>${r.weeksShort} semana${r.weeksShort === 1 ? '' : 's'} con rotura</span>` }),
      kpiHtml({ l: 'Capacidad semanal', v: fmtN(r.cap), u: ' kits' }),
      kpiHtml({ l: 'Coste adicional', v: fmtEur(r.cost) }),
      kpiHtml({ l: 'Margen perdido', v: fmtEur(r.lost) }),
    ].join('');
    wk.redraw(); st.redraw();
  };
  $$('#cap-in input[type="range"]').forEach((inp) => inp.addEventListener('input', () => {
    const s = CAP_SLIDERS.find((x) => x.k === inp.dataset.k); DSS_STATE.cap[s.k] = +inp.value;
    $(`#cap-${s.k}-o`).textContent = s.fmt(+inp.value); inp.setAttribute('aria-valuetext', s.fmt(+inp.value));
    update();
  }));
  $('#cap-reset').addEventListener('click', () => {
    DSS_STATE.cap = Object.assign({}, CAP_BASE);
    CAP_SLIDERS.forEach((s) => { $(`#cap-${s.k}`).value = DSS_STATE.cap[s.k]; $(`#cap-${s.k}-o`).textContent = s.fmt(DSS_STATE.cap[s.k]); });
    update();
  });
  update();
}
