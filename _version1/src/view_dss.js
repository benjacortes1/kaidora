/* ===================================================================== view_dss.js
   DSS: modelos de simulación para decisiones semiestructuradas. */

const FICHA_DSS = {
  datos: ['Datos internos del MIS: ventas, costes, capacidad y peticiones de clientes', '<strong>Datos externos</strong>: población (INE), mercado, precios de la competencia', 'Supuestos que introduce quien decide (precio, demanda, turnos)', 'Modelos: VAN, punto de equilibrio, sensibilidad y capacidad'],
  nivel: 'Decisional (táctico-estratégico)',
  nivelTxt: 'Decisiones semiestructuradas, no rutinarias y con incertidumbre: lanzar un producto o dimensionar la campaña de Navidad.',
  usuarios: ['Analista de datos y control de gestión', 'Dirección de operaciones (COO) y comercial (CCO)', 'Responsables de producto y de compras', 'Comité de dirección, cuando se le presenta la propuesta'],
  frecuencia: 'Bajo demanda (ad hoc), cuando hay que tomar una decisión',
  formato: 'Simulador interactivo con escenarios, análisis «¿qué pasaría si…?», sensibilidad y recomendación.',
  ejemplos: ['Calculadora de ingresos de Amazon FBA para fijar el precio de un kit nuevo', 'Programa maestro de producción (MPS) de Odoo para planificar la campaña de Navidad', 'Google Trends para anticipar la demanda estacional de «botiquín de viaje»', 'Parámetros what-if de Power BI o Solver de Excel para optimizar turnos'],
  porque: 'Hay decisiones que no se repiten y no tienen una respuesta fija. El DSS combina datos internos y externos con modelos para comparar alternativas antes de comprometer dinero.',
};

/* ---------------------------------------------------------------- modelo 1: lanzamiento del Kit Accesible */
const KIT_BASE = { price: 44, cost: 17.5, market: 1400, pen: 0.45, growth: 35, invest: 68, subsidy: 20, mkt: 24, farm: 35 };
const KIT_SCEN = {
  pes: { label: 'Pesimista', p: { price: 38, cost: 19.5, market: 1000, pen: 0.25, growth: 15, invest: 80, subsidy: 0, mkt: 30, farm: 45 } },
  base: { label: 'Base', p: KIT_BASE },
  opt: { label: 'Optimista', p: { price: 46, cost: 16.5, market: 1800, pen: 0.7, growth: 50, invest: 60, subsidy: 35, mkt: 22, farm: 30 } },
};
const KIT_SLIDERS = [
  { k: 'price', label: 'Precio de venta (PVP)', min: 30, max: 60, step: 1, fmt: (v) => `${v} €`, hint: 'Como referencia, el kit Familia cuesta 39 €.' },
  { k: 'cost', label: 'Coste unitario', min: 12, max: 26, step: 0.5, fmt: (v) => `${dec(v, 2)} €`, hint: 'Componentes, etiquetas en braille, pictogramas y montaje.' },
  { k: 'market', label: 'Mercado objetivo', min: 500, max: 3000, step: 50, fmt: (v) => `${fmtN(v)} mil hogares`, hint: 'Hogares con alguna persona con discapacidad o mayor de 75 años (estimación a partir del INE).' },
  { k: 'pen', label: 'Penetración el primer año', min: 0.1, max: 1.5, step: 0.05, fmt: (v) => `${dec(v, 2)} %`, hint: 'Parte del mercado objetivo que compra el kit.' },
  { k: 'growth', label: 'Crecimiento anual de ventas', min: 0, max: 80, step: 5, fmt: (v) => `${v} %` },
  { k: 'invest', label: 'Inversión inicial', min: 20, max: 150, step: 2, fmt: (v) => `${v} k€`, hint: 'Diseño con asociaciones, braille, vídeos en lengua de signos y pruebas con usuarios.' },
  { k: 'subsidy', label: 'Subvención a la innovación social', min: 0, max: 50, step: 5, fmt: (v) => `${v} %`, hint: 'Parte de la inversión que cubren las ayudas públicas.' },
  { k: 'mkt', label: 'Marketing anual', min: 5, max: 80, step: 1, fmt: (v) => `${v} k€` },
  { k: 'farm', label: 'Ventas a través de farmacias', min: 0, max: 70, step: 5, fmt: (v) => `${v} %`, hint: 'La farmacia llega mejor a las personas mayores, pero deja menos margen.' },
];
const KIT_LABELS = { price: 'Precio de venta', cost: 'Coste unitario', market: 'Mercado objetivo', pen: 'Penetración inicial', growth: 'Crecimiento anual', invest: 'Inversión inicial', mkt: 'Marketing anual', farm: 'Peso de farmacias' };
function kitModel(p) {
  const direct = 1 - p.farm / 100;
  const netPrice = direct * p.price * 0.81 + (1 - direct) * p.price * 0.63 * 0.96;   // tras comisiones de canal
  const logi = direct * 2.5 + (1 - direct) * 0.9;
  const unitC = netPrice - p.cost - logi;                                          // margen de contribución por kit
  const y1 = p.market * 1000 * p.pen / 100;
  const yearly = [y1, y1 * (1 + p.growth / 100), y1 * Math.pow(1 + p.growth / 100, 2)];
  const ramp = [0.4, 0.4, 0.4, 0.7, 0.7, 0.7, 1, 1, 1, 1, 1, 1];
  const mu = [];
  for (let m = 0; m < 36; m++) { const y = Math.floor(m / 12); mu.push((yearly[y] / 12) * (y === 0 ? ramp[m] : 1)); }
  const inv = p.invest * 1000 * (1 - p.subsidy / 100);
  const mk = (p.mkt * 1000) / 12;
  const r = Math.pow(1.08, 1 / 12) - 1;
  let cum = -inv, npv = -inv, payback = null; const cumS = [cum];
  mu.forEach((u, m) => { const cf = u * unitC - mk; cum += cf; npv += cf / Math.pow(1 + r, m + 1); cumS.push(cum); if (payback == null && cum >= 0) payback = m + 1; });
  const units3 = sum(mu);
  return {
    netPrice, unitC, yearly, units3, revenue3: units3 * netPrice, npv, payback, cumS, inv,
    be: unitC > 0 ? (p.mkt * 1000 + inv / 3) / unitC : Infinity,
    people: units3 * 2.5, ceeHours: (units3 * 4) / 60, y1u: sum(mu.slice(0, 12)), margin: p.price ? unitC / netPrice : 0,
  };
}
function kitTornado(p) {
  const base = kitModel(p).npv;
  return Object.keys(KIT_LABELS).map((k) => {
    const lo = kitModel(Object.assign({}, p, { [k]: p[k] * 0.8 })).npv - base;
    const hi = kitModel(Object.assign({}, p, { [k]: p[k] * 1.2 })).npv - base;
    return { k, label: KIT_LABELS[k], lo, hi, span: Math.max(Math.abs(lo), Math.abs(hi)) };
  }).sort((a, b) => b.span - a.span);
}
function kitVerdict(res) {
  if (res.npv > 0 && res.payback && res.payback <= 24) return ['good', 'Recomendado: lanzar el Kit Accesible', `Recupera la inversión en ${res.payback} meses y genera un VAN positivo a 3 años.`];
  if (res.npv > 0) return ['warn', 'Lanzar con una prueba piloto', `El VAN es positivo, pero la inversión tarda ${res.payback ? res.payback + ' meses' : 'más de 3 años'} en recuperarse. Conviene validar la demanda antes.`];
  return ['crit', 'No lanzar con estos supuestos', 'El proyecto no recupera la inversión en 3 años. Revisa las variables que más pesan en el análisis de sensibilidad.'];
}

/* ---------------------------------------------------------------- modelo 2: capacidad para el Q4 */
const CAP_BASE = { growth: 16, pat: 2, rib: 1, oee: 81, temps: 12, overtime: 5, stock: 18 };
const CAP_SLIDERS = [
  { k: 'growth', label: 'Crecimiento de la demanda frente al Q4 de 2025', min: 0, max: 40, step: 1, fmt: (v) => `+${v} %`, hint: 'En lo que va de 2026 crecemos un 16 % frente a 2025.' },
  { k: 'pat', label: 'Turnos en la nave de Paterna', min: 1, max: 3, step: 1, fmt: (v) => `${v} turno${v > 1 ? 's' : ''}`, hint: 'Cada turno monta unos 7.100 kits por semana.' },
  { k: 'rib', label: 'Turnos en la nave de Riba-roja', min: 1, max: 3, step: 1, fmt: (v) => `${v} turno${v > 1 ? 's' : ''}`, hint: 'Cada turno monta unos 2.700 kits por semana con la línea semiautomática.' },
  { k: 'oee', label: 'OEE objetivo en Riba-roja', min: 70, max: 90, step: 1, fmt: (v) => `${v} %`, hint: 'Mejorar el OEE equivale a ganar capacidad sin contratar (ODS 9).' },
  { k: 'temps', label: 'Personal temporal de refuerzo', min: 0, max: 40, step: 1, fmt: (v) => `${v} personas` },
  { k: 'overtime', label: 'Horas extra', min: 0, max: 15, step: 1, fmt: (v) => `${v} %` },
  { k: 'stock', label: 'Stock de kits montados a 1 de octubre', min: 0, max: 40, step: 1, fmt: (v) => `${v} mil kits` },
];
const Q4_WEEKS = ['1 oct', '8 oct', '15 oct', '22 oct', '29 oct', '5 nov', '12 nov', '19 nov', '26 nov', '3 dic', '10 dic', '17 dic', '24 dic'];
const Q4_W = [0.066, 0.068, 0.070, 0.072, 0.075, 0.079, 0.084, 0.094, 0.110, 0.097, 0.085, 0.062, 0.038];
const Q4_2025 = sum(D.production.filter((p) => p[0] >= 21 && p[0] <= 23), (p) => p[3]);
function capModel(p) {
  const demand = Q4_2025 * (1 + p.growth / 100);
  const weeks = Q4_W.map((w) => demand * w);
  const base = p.pat * 1420 * 5 + p.rib * 540 * 5 * (p.oee / 81);
  const cap = (base + p.temps * 6.5 * 37.5 * 0.8) * (1 + p.overtime / 100);
  let stock = p.stock * 1000, short = 0, weeksShort = 0; const stockS = [];
  weeks.forEach((d) => { stock += cap - d; if (stock < 0) { short += -stock; weeksShort++; stock = 0; } stockS.push(stock); });
  const cost = ((p.pat - 2) * 9800 + (p.rib - 1) * 4600 + p.temps * 560 + 42000 * (p.overtime / 100) * 1.25) * 13;
  const lost = short * 9.3;
  return { demand, weeks, cap, stockS, short, weeksShort, service: 1 - short / demand, cost, lost, total: cost + lost, endStock: stock };
}

/* ---------------------------------------------------------------- vista */
const DSS_STATE = { kit: Object.assign({}, KIT_BASE), kitScen: 'base', cap: Object.assign({}, CAP_BASE) };
RENDER.dss = function () {
  const el = mount('view-dss', `
    ${panelHead({ l: 'dss', levelName: 'Nivel decisional', title: 'DSS · Sistema de apoyo a la decisión', q: '¿Qué pasaría si…? Dos decisiones reales de Kaidora', extra: propagation() })}
    ${fichaHtml(FICHA_DSS)}
    <div class="tabs-row"><div class="seg" role="tablist" aria-label="Modelos de decisión">
      <button type="button" role="tab" id="dss-tab-kit" aria-selected="${S.dssTab === 'kit'}" data-dsstab="kit">¿Lanzamos el Kit Accesible?</button>
      <button type="button" role="tab" id="dss-tab-cap" aria-selected="${S.dssTab === 'cap'}" data-dsstab="cap">¿Tenemos capacidad para Navidad?</button>
    </div><span class="muted" style="font-size:.86rem">Los filtros globales no se aplican: el DSS trabaja con escenarios.</span></div>
    <div id="dss-body" role="tabpanel" aria-labelledby="dss-tab-${S.dssTab}"></div>`);
  $$('[data-dsstab]', el).forEach((b) => {
    b.addEventListener('click', () => { S.dssTab = b.dataset.dsstab; RENDER.dss(); $('#dss-tab-' + S.dssTab).focus(); });
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); S.dssTab = S.dssTab === 'kit' ? 'cap' : 'kit'; RENDER.dss(); $('#dss-tab-' + S.dssTab).focus(); } });
  });
  if (S.dssTab === 'kit') dssKit($('#dss-body')); else dssCap($('#dss-body'));
};

function sliderHtml(s, val, prefix) {
  const id = `${prefix}-${s.k}`;
  return `<div class="sl"><div class="sl-top"><label for="${id}">${s.label}</label><output for="${id}" id="${id}-out">${s.fmt(val)}</output></div>
    <input type="range" id="${id}" data-k="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}" aria-valuetext="${esc(s.fmt(val))}"${s.hint ? ` aria-describedby="${id}-h"` : ''}>
    ${s.hint ? `<span class="hint" id="${id}-h">${s.hint}</span>` : ''}</div>`;
}

function dssKit(body) {
  const cu = D.customers; const acc = cu.accesible;
  const todayAcc = TPS.log.filter((o) => o.access && o.manual).length;
  body.innerHTML = `
  <div class="grid g-5-7">
    <div class="stack">
      <section class="card stack" style="gap:12px" aria-labelledby="h-sig">
        <h3 id="h-sig">Señales que justifican la pregunta</h3>
        <ul style="margin:0;padding-left:1.1em;display:grid;gap:6px;font-size:.9rem;color:var(--ink-2)">
          <li><b>${fmtN(acc[acc.length - 1][1])}</b> peticiones de formato accesible en septiembre (${signPct(acc[acc.length - 1][1] / acc[0][1] - 1, 0)} desde enero) <a href="#mis" data-go="mis" data-go-opts='{"tab":"clientes","scrollTo":"mis-inclusive"}'>MIS</a>${todayAcc ? ` · <b>+${todayAcc}</b> registradas hoy en el <a href="#tps" data-go="tps">TPS</a>` : ''}</li>
          <li>Las personas de 65 años o más son el <b>26 %</b> de la población adulta, pero solo el <b>8 %</b> de nuestros compradores web; su NPS es <b>${cu.nps[5]}</b></li>
          <li><b>4,38 millones</b> de personas con discapacidad en España (INE, encuesta EDAD 2020)</li>
          <li>Prevalencia de diabetes en adultos: <b>≈ 14 %</b> (estudio Di@bet.es), un público al que ya servimos</li>
        </ul>
        <p class="muted" style="font-size:.82rem">Propuesta: un kit con etiquetas en braille, pictogramas, instrucciones en lectura fácil (UNE 153101 EX) y QR a vídeos en lengua de signos, co-diseñado con asociaciones («nada sobre nosotros sin nosotros»). Lo montaría un Centro Especial de Empleo.</p>
      </section>
      <section class="card stack" style="gap:14px" aria-labelledby="h-sup-kit" id="dss-kit-inputs">
        <div class="row" style="justify-content:space-between"><h3 id="h-sup-kit">Supuestos</h3>
          <div class="seg" role="group" aria-label="Escenarios predefinidos">${Object.entries(KIT_SCEN).map(([k, s]) => `<button type="button" data-scen="${k}" aria-pressed="${DSS_STATE.kitScen === k}">${s.label}</button>`).join('')}</div></div>
        <div class="sliders">${KIT_SLIDERS.map((s) => sliderHtml(s, DSS_STATE.kit[s.k], 'kit')).join('')}</div>
      </section>
    </div>
    <div class="stack" id="dss-kit-out">
      <div class="verdict" id="kit-verdict" aria-live="polite"></div>
      <div class="kpis" id="kit-kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"></div>
      <div data-slot="cash"></div>
      <div data-slot="tornado"></div>
      <section class="card" aria-labelledby="h-scen"><div class="card-head"><div><h3 id="h-scen">Comparación de escenarios</h3><p class="card-sub">Los tres escenarios predefinidos frente a tus supuestos actuales</p></div></div>
        <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Escenario</th><th scope="col" class="r">Kits año 1</th><th scope="col" class="r">VAN 3 años</th><th scope="col" class="r">Recuperación</th><th scope="col">Decisión</th></tr></thead><tbody id="kit-scen"></tbody></table></div></section>
      <section class="card stack" style="gap:10px" aria-labelledby="h-impact" id="dss-impact"><h3 id="h-impact">Impacto social estimado (ODS 10)</h3><div class="kpis" id="kit-impact" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"></div></section>
    </div>
  </div>`;
  const cash = put(body, 'cash', chartCard({
    id: 'dss-cash', title: 'Flujo de caja acumulado a 36 meses', sub: 'Inversión neta de subvención al inicio; después, margen de las ventas menos marketing',
    easy: '', draw: (c, w) => drawKitCash(c, w),
  }));
  const tor = put(body, 'tornado', chartCard({
    id: 'dss-tornado', title: 'Análisis de sensibilidad del VAN', sub: 'Cuánto cambia el VAN si cada variable baja o sube un 20 %. Azul: el VAN sube; rojo: baja.',
    legend: [{ name: 'El VAN sube', color: 'var(--div-pos)' }, { name: 'El VAN baja', color: 'var(--div-neg)' }],
    easy: '', draw: (c, w) => drawTornado(c, w, { rows: kitTornado(DSS_STATE.kit), fmt: (v) => fmtEur(v) }),
  }));
  const update = () => {
    const p = DSS_STATE.kit, res = kitModel(p), [lvl, title, txt] = kitVerdict(res);
    $('#kit-verdict').innerHTML = `${statusChip(lvl, lvl === 'good' ? 'Lanzar' : lvl === 'warn' ? 'Piloto' : 'No lanzar')}<div><div class="big">${title}</div><p class="ink2" style="font-size:.9rem">${txt}</p></div>`;
    $('#kit-kpis').innerHTML = [
      kpiHtml({ label: 'VAN a 3 años (tasa 8 %)', value: (res.npv >= 0 ? '+' : '') + fmtEur(res.npv) }),
      kpiHtml({ label: 'Recuperación de la inversión', value: res.payback ? String(res.payback) : '> 36', unit: ' meses' }),
      kpiHtml({ label: 'Kits vendidos el año 1', value: fmtN(res.y1u), foot: `en 3 años: ${fmtN(res.units3)}` }),
      kpiHtml({ label: 'Margen de contribución por kit', value: dec(res.unitC, 2) + ' €', foot: `precio neto medio ${dec(res.netPrice, 2)} €` }),
      kpiHtml({ label: 'Punto de equilibrio', value: isFinite(res.be) ? fmtN(res.be) : '—', unit: ' kits/año', foot: 'para cubrir marketing e inversión' }),
    ].join('');
    $('#kit-impact').innerHTML = [
      kpiHtml({ label: 'Personas que acceden a un kit usable', value: fmtN(res.people), foot: 'en 3 años · 2,5 personas por hogar' }),
      kpiHtml({ label: 'Horas de trabajo en el CEE', value: fmtN(res.ceeHours), foot: 'montaje y etiquetado en braille' }),
      kpiHtml({ label: 'Precio frente al kit Familia', value: signPct(p.price / 39 - 1, 0), foot: 'un precio alto también excluye' }),
    ].join('');
    $('#kit-scen').innerHTML = Object.entries(KIT_SCEN).map(([, s]) => ['', s.label, s.p]).concat([['cur', 'Tus supuestos', p]]).map(([k, lab, pp]) => {
      const r = kitModel(pp); const [lv] = kitVerdict(r);
      return `<tr${k === 'cur' ? ' style="font-weight:700"' : ''}><td>${lab}</td><td class="r">${fmtN(r.y1u)}</td><td class="r">${(r.npv >= 0 ? '+' : '') + fmtEur(r.npv)}</td><td class="r">${r.payback ? r.payback + ' meses' : '> 36 meses'}</td><td>${statusChip(lv, lv === 'good' ? 'Lanzar' : lv === 'warn' ? 'Piloto' : 'No lanzar')}</td></tr>`;
    }).join('');
    const tor0 = kitTornado(p)[0];
    cash.querySelector('.easy-t') && (cash.querySelector('.easy-t').textContent = res.payback ? `Al principio perdemos dinero por la inversión; a partir del mes ${res.payback} el kit ya ha devuelto lo invertido.` : 'Con estos supuestos, el kit no llega a devolver la inversión en 3 años.');
    const easyT = cash.querySelector('.easy-t'); if (!easyT) { const cap = frag(`<figcaption class="easy">${icon('eye')}<span><b>En pocas palabras:</b> <span class="easy-t"></span></span></figcaption>`); cash.appendChild(cap); cap.querySelector('.easy-t').textContent = res.payback ? `Al principio perdemos dinero por la inversión; a partir del mes ${res.payback} el kit ya ha devuelto lo invertido.` : 'Con estos supuestos, el kit no llega a devolver la inversión en 3 años.'; }
    const tEasy = tor.querySelector('.easy-t');
    const tTxt = `La variable que más pesa es «${tor0.label.toLowerCase()}»: un 20 % de cambio mueve el VAN hasta ${fmtEur(tor0.span)}. Es la que más conviene validar antes de decidir.`;
    if (tEasy) tEasy.textContent = tTxt; else { const cap = frag(`<figcaption class="easy">${icon('eye')}<span><b>En pocas palabras:</b> <span class="easy-t"></span></span></figcaption>`); tor.appendChild(cap); cap.querySelector('.easy-t').textContent = tTxt; }
    cash.redraw(); tor.redraw();
  };
  $$('#dss-kit-inputs input[type="range"]').forEach((inp) => inp.addEventListener('input', () => {
    const s = KIT_SLIDERS.find((x) => x.k === inp.dataset.k); DSS_STATE.kit[s.k] = +inp.value; DSS_STATE.kitScen = '';
    $(`#kit-${s.k}-out`).textContent = s.fmt(+inp.value); inp.setAttribute('aria-valuetext', s.fmt(+inp.value));
    $$('[data-scen]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    update();
  }));
  $$('[data-scen]', body).forEach((b) => b.addEventListener('click', () => {
    DSS_STATE.kitScen = b.dataset.scen; DSS_STATE.kit = Object.assign({}, KIT_SCEN[b.dataset.scen].p);
    KIT_SLIDERS.forEach((s) => { const inp = $(`#kit-${s.k}`); inp.value = DSS_STATE.kit[s.k]; $(`#kit-${s.k}-out`).textContent = s.fmt(DSS_STATE.kit[s.k]); inp.setAttribute('aria-valuetext', s.fmt(DSS_STATE.kit[s.k])); });
    $$('[data-scen]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  }));
  update();
}
function drawKitCash(c, w) {
  const res = kitModel(DSS_STATE.kit);
  drawLine(c, w, {
    labels: range(0, 36).map((m) => (m === 0 ? 'Inicio' : `Mes ${m}`)), h: 260, yFmt: eurAxis, xEvery: 6,
    series: [{ name: 'Caja acumulada', color: 'var(--s1)', values: res.cumS, area: true, fmt: (v) => fmtEur(v) }],
    refs: [{ v: 0, label: 'Inversión recuperada' }],
    notes: res.payback ? [{ i: res.payback, label: `Mes ${res.payback}` }] : [],
    tipTitle: (i) => (i === 0 ? 'Inicio del proyecto' : `Mes ${i}`),
  });
}

function dssCap(body) {
  body.innerHTML = `
  <div class="grid g-5-7">
    <div class="stack">
      <section class="card stack" style="gap:10px" aria-labelledby="h-ctx-cap">
        <h3 id="h-ctx-cap">La pregunta</h3>
        <p class="ink2" style="font-size:.92rem">Entre octubre y diciembre montamos el ${fmtPct(Q4_2025 / sum(D.production.filter((p) => mYear(p[0]) === 2025), (p) => p[3]), 0)} de los kits del año. En 2025 fueron <b>${fmtN(Q4_2025)}</b>. La semana de Black Friday (27 de noviembre) multiplica la demanda. ¿Qué combinación de turnos, refuerzos y stock previo nos permite servirlo todo al menor coste?</p>
        <p class="muted" style="font-size:.82rem">Datos del MIS: producción del Q4 2025 por semana, capacidad por turno y OEE actual de cada nave.</p>
      </section>
      <section class="card stack" style="gap:14px" aria-labelledby="h-sup-cap" id="dss-cap-inputs">
        <div class="row" style="justify-content:space-between"><h3 id="h-sup-cap">Supuestos</h3><button type="button" class="btn btn-sm" id="cap-reset">${icon('refresh')}Restablecer</button></div>
        <div class="sliders">${CAP_SLIDERS.map((s) => sliderHtml(s, DSS_STATE.cap[s.k], 'cap')).join('')}</div>
      </section>
    </div>
    <div class="stack">
      <div class="verdict" id="cap-verdict" aria-live="polite"></div>
      <div class="kpis" id="cap-kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"></div>
      <div data-slot="weeks"></div>
      <div data-slot="stock"></div>
    </div>
  </div>`;
  const wk = put(body, 'weeks', chartCard({
    id: 'dss-weeks', title: 'Kits a montar por semana frente a la capacidad', sub: 'Barras: kits necesarios · línea discontinua: capacidad semanal con tus supuestos',
    legend: [{ name: 'Semana dentro de la capacidad', color: 'var(--s1)' }, { name: 'Semana por encima de la capacidad', color: 'var(--s2)' }],
    easy: '', draw: (c, w) => {
      const r = capModel(DSS_STATE.cap);
      drawCols(c, w, { labels: Q4_WEEKS, h: 250, yFmt: (v) => dec(v / 1000, 0) + ' k', fmt: fmtN, series: [{ name: 'Kits necesarios', color: 'var(--s1)', values: r.weeks }], colorAt: (i) => (r.weeks[i] > r.cap ? 'var(--s2)' : 'var(--s1)'), refs: [{ v: r.cap, label: `Capacidad ${fmtN(r.cap)}` }], tipTitle: (i) => `Semana del ${Q4_WEEKS[i]}`, tipExtra: (i) => [{ name: 'Capacidad', value: fmtN(r.cap) }, { name: 'Stock al final', value: fmtN(r.stockS[i]) }] });
    },
  }));
  const st = put(body, 'stock', chartCard({
    id: 'dss-stock', title: 'Stock de kits montados al final de cada semana', sub: 'Cuando llega a cero, hay pedidos que no podemos servir',
    easy: '', draw: (c, w) => {
      const r = capModel(DSS_STATE.cap);
      drawLine(c, w, { labels: Q4_WEEKS, h: 220, yFmt: (v) => dec(v / 1000, 0) + ' k', series: [{ name: 'Stock', color: 'var(--s1)', values: r.stockS, area: true, fmt: fmtN }], tipTitle: (i) => `Semana del ${Q4_WEEKS[i]}` });
    },
  }));
  const update = () => {
    const p = DSS_STATE.cap, r = capModel(p);
    const lvl = r.service >= 0.995 ? 'good' : r.service >= 0.97 ? 'warn' : 'crit';
    const title = lvl === 'good' ? 'Plan viable: se sirve toda la demanda' : lvl === 'warn' ? 'Plan ajustado: algunas roturas puntuales' : 'Plan insuficiente: roturas en la semana de Black Friday';
    const alt = [];
    if (lvl !== 'good') {
      [{ k: 'temps', d: 8, t: '+8 personas temporales' }, { k: 'rib', d: 1, t: '+1 turno en Riba-roja' }, { k: 'pat', d: 1, t: '+1 turno en Paterna' }, { k: 'stock', d: 8, t: '+8.000 kits de stock previo' }].forEach((o) => {
        const q = Object.assign({}, p); const s = CAP_SLIDERS.find((x) => x.k === o.k); q[o.k] = Math.min(s.max, q[o.k] + o.d); const rr = capModel(q);
        if (q[o.k] !== p[o.k]) alt.push({ t: o.t, total: rr.total, service: rr.service });
      });
      alt.sort((a, b) => a.total - b.total);
    }
    $('#cap-verdict').innerHTML = `${statusChip(lvl, lvl === 'good' ? 'Viable' : lvl === 'warn' ? 'Ajustado' : 'Insuficiente')}<div><div class="big">${title}</div><p class="ink2" style="font-size:.9rem">${lvl === 'good' ? `Coste adicional del plan: ${fmtEur(r.cost)}. Stock final a 31 de diciembre: ${fmtN(r.endStock)} kits.` : `La opción más barata para mejorarlo es ${esc(alt[0].t)} (nivel de servicio ${fmtPct(alt[0].service)}, coste total ${fmtEur(alt[0].total)}).`}</p></div>`;
    $('#cap-kpis').innerHTML = [
      kpiHtml({ label: 'Nivel de servicio', value: fmtPct(r.service), foot: statusChip(lvl, lvl === 'good' ? 'sin roturas' : `${r.weeksShort} semana${r.weeksShort === 1 ? '' : 's'} con rotura`) }),
      kpiHtml({ label: 'Kits no servidos', value: fmtN(r.short) }),
      kpiHtml({ label: 'Capacidad semanal', value: fmtN(r.cap), unit: ' kits' }),
      kpiHtml({ label: 'Coste adicional del plan', value: fmtEur(r.cost), foot: 'turnos, refuerzos y horas extra (13 semanas)' }),
      kpiHtml({ label: 'Margen perdido por roturas', value: fmtEur(r.lost), foot: '9,30 € de margen medio por kit' }),
    ].join('');
    const peak = r.weeks.indexOf(Math.max(...r.weeks));
    const e1 = wk.querySelector('.easy-t'), e2 = st.querySelector('.easy-t');
    const t1 = `La semana de más trabajo es la del ${Q4_WEEKS[peak]} (Black Friday), con ${fmtN(r.weeks[peak])} kits. ${r.weeks.filter((x) => x > r.cap).length} semanas superan la capacidad y tiran del stock.`;
    const t2 = r.short > 0 ? `El stock se agota y faltan ${fmtN(r.short)} kits. Hay que añadir capacidad o empezar con más stock.` : `El stock nunca llega a cero: el mínimo es de ${fmtN(Math.min(...r.stockS))} kits.`;
    [[wk, e1, t1], [st, e2, t2]].forEach(([card, e, t]) => { if (e) e.textContent = t; else { const cap = frag(`<figcaption class="easy">${icon('eye')}<span><b>En pocas palabras:</b> <span class="easy-t"></span></span></figcaption>`); card.appendChild(cap); cap.querySelector('.easy-t').textContent = t; } });
    wk.redraw(); st.redraw();
  };
  $$('#dss-cap-inputs input[type="range"]').forEach((inp) => inp.addEventListener('input', () => {
    const s = CAP_SLIDERS.find((x) => x.k === inp.dataset.k); DSS_STATE.cap[s.k] = +inp.value;
    $(`#cap-${s.k}-out`).textContent = s.fmt(+inp.value); inp.setAttribute('aria-valuetext', s.fmt(+inp.value));
    update();
  }));
  $('#cap-reset').addEventListener('click', () => {
    DSS_STATE.cap = Object.assign({}, CAP_BASE);
    CAP_SLIDERS.forEach((s) => { const inp = $(`#cap-${s.k}`); inp.value = DSS_STATE.cap[s.k]; $(`#cap-${s.k}-out`).textContent = s.fmt(DSS_STATE.cap[s.k]); });
    update();
  });
  update();
}
