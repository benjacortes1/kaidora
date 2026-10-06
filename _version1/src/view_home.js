/* ===================================================================== view_home.js
   Portada: pirámide organizacional clicable + resumen de los 4 sistemas. */

const LEVELS = [
  { id: 'ess', acr: 'ESS', nivel: 'Estratégico', users: 'Comité de dirección', q: '¿Hacia dónde vamos?' },
  { id: 'dss', acr: 'DSS', nivel: 'Decisional', users: 'Dirección y analistas', q: '¿Qué pasaría si…?' },
  { id: 'mis', acr: 'MIS', nivel: 'Gerencial', users: 'Jefes de departamento', q: '¿Cómo vamos frente al plan?' },
  { id: 'tps', acr: 'TPS', nivel: 'Operacional', users: 'Operarios y personal de primera línea', q: '¿Qué está pasando ahora?' },
];

function drawPyramidNav(el, W) {
  const compact = W < 560;
  const VW = compact ? 440 : 680, VH = 392;
  const cx = compact ? 220 : 262, top = 14, bot = 378, hwMax = compact ? 210 : 214;
  const hw = (y) => (hwMax * (y - top)) / (bot - top);
  const bandH = (bot - top) / 4, gap = 5;
  const svg = sv('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'group', 'aria-label': 'Pirámide de sistemas de información de Kaidora. Pulsa un nivel para abrir su panel.' });
  if (!compact) {
    // flecha de agregación (izquierda)
    sv('path', { d: `M22 ${bot - 6}V${top + 26}`, class: 'arrow' }, svg);
    sv('path', { d: `M16 ${top + 32}L22 ${top + 20}L28 ${top + 32}Z`, class: 'arrow-head' }, svg);
    const t = sv('text', { x: 0, y: 0, class: 'side-muted', transform: `translate(40 ${(top + bot) / 2}) rotate(-90)`, 'text-anchor': 'middle', text: 'Más agregación y más datos externos' }, svg);
    void t;
  }
  LEVELS.forEach((L, i) => {
    const y0 = top + i * bandH + (i ? gap / 2 : 0), y1 = top + (i + 1) * bandH - gap / 2;
    const a = hw(y0), b = hw(y1);
    const d = i === 0 ? `M${cx},${y0}L${cx + b},${y1}L${cx - b},${y1}Z` : `M${cx - a},${y0}L${cx + a},${y0}L${cx + b},${y1}L${cx - b},${y1}Z`;
    const g = sv('g', { class: 'lvl', tabindex: 0, role: 'button', 'aria-label': `${L.acr}, nivel ${L.nivel.toLowerCase()}: ${L.users}. ${L.q}` }, svg);
    sv('path', { d, style: { fill: `var(--lvl-${L.id})` } }, g);
    const my = (y0 + y1) / 2 + (i === 0 ? 14 : 0);
    sv('text', { x: cx, y: my + (i === 0 ? -4 : 0), 'text-anchor': 'middle', class: 'acr', style: { fill: `var(--lvl-${L.id}-ink)`, fontSize: i === 0 ? '22px' : '26px' }, text: L.acr }, g);
    sv('text', { x: cx, y: my + (i === 0 ? 13 : 20), 'text-anchor': 'middle', class: 'lvn', style: { fill: `var(--lvl-${L.id}-ink)` }, text: L.nivel }, g);
    if (!compact) {
      const ax = cx + b + 10, lx = cx + hwMax + 22;
      sv('path', { d: `M${cx + (a + b) / 2 + 6},${(y0 + y1) / 2}H${lx - 6}`, style: { stroke: 'var(--line-2)', strokeWidth: 1 } }, g);
      sv('text', { x: lx, y: (y0 + y1) / 2 - 4, class: 'side', text: L.users.length > 24 ? 'Operarios y personal' : L.users }, g);
      sv('text', { x: lx, y: (y0 + y1) / 2 + 13, class: 'side-muted', text: L.q }, g);
      void ax;
    }
    const open = () => go(L.id);
    g.addEventListener('click', open);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    g.addEventListener('pointermove', (e) => Tip.show(e.clientX, e.clientY, tipNode(`${L.acr} · nivel ${L.nivel.toLowerCase()}`, [{ name: 'Usuarios', value: L.users }, { name: 'Pregunta', value: L.q }])));
    g.addEventListener('pointerleave', () => Tip.hide());
  });
  el.replaceChildren(svg);
  const list = el.parentElement.querySelector('.pyr-list');
  if (list) list.hidden = !compact;
}

RENDER.home = function () {
  const all = { ch: -1, li: -1, co: -1 };
  const ytd = agg(periodMonths('ytd'), all);
  const y25 = agg(periodMonths('y25'), all);
  const sep = agg([LAST], all);
  const sepB = budgetFor([LAST], all);
  const acc = D.customers.accesible;
  const accLast = acc[acc.length - 1][1], accFirst = acc[0][1];
  const npv = typeof kitModel === 'function' ? kitModel(KIT_BASE).npv : 0;
  const ytdShare = D.channels.map((c, i) => ytd.byCh[i].rev / ytd.rev);

  const el = mount('view-home', `
  <section class="hero">
    <div>
      <p class="eyebrow">Actividad 1 · Sistemas de Información para la Gestión · Universidad Europea</p>
      <h1 style="margin-top:10px">Kaidora: un mismo dato, cuatro niveles de decisión</h1>
      <p class="lead" style="margin-top:14px">Kaidora diseña, monta y vende kits de primeros auxilios desde Valencia. Este panel muestra cómo sus sistemas de información convierten cada pedido del almacén (<b>TPS</b>) en informes para los mandos (<b>MIS</b>), en simulaciones para decidir (<b>DSS</b>) y en indicadores para la dirección (<b>ESS</b>).</p>
      <div class="hero-facts">
        <span class="fact"><b>${fmtEur(y25.rev)}</b><span>Ventas 2025</span></span>
        <span class="fact"><b>${HR.total}</b><span>Personas en plantilla</span></span>
        <span class="fact"><b>${fmtN(y25.units / 1000)} mil</b><span>Kits vendidos en 2025</span></span>
        <span class="fact"><b>8 · 5 · 5</b><span>Líneas · canales · países</span></span>
        <span class="fact"><b>2 naves</b><span>Paterna y Riba-roja</span></span>
      </div>
      <div class="row" style="margin-top:20px">
        <button type="button" class="btn btn-primary" data-tour-start>${icon('play')}Iniciar recorrido guiado</button>
        <button type="button" class="btn" data-go="cmp">${icon('compare')}Comparar los 4 sistemas</button>
      </div>
    </div>
    <div class="card pyr-wrap">
      <div class="pyr" data-slot="pyr"></div>
      <ul class="pyr-list" hidden style="margin:0;padding-left:1.1em;font-size:.86rem;color:var(--ink-2)">
        ${LEVELS.map((L) => `<li><b>${L.acr}</b> · ${L.users}: ${L.q}</li>`).join('')}
      </ul>
      <p class="muted" style="font-size:.84rem">Pulsa un nivel (o usa Tab e Intro) para abrir su panel. Los datos suben agregándose; las decisiones bajan convertidas en objetivos.</p>
    </div>
  </section>

  <section class="stack" aria-labelledby="h-sys">
    <div class="tabs-row"><h2 id="h-sys">Los cuatro paneles</h2><span class="muted" style="font-size:.86rem">Datos simulados a 30/09/2026 · cierre del 3.er trimestre</span></div>
    <div class="sys-cards">
      <button type="button" class="sys-card" data-go="tps" style="--c:var(--lvl-tps)">
        <span class="lvl-chip" data-l="tps"><b>TPS</b>Operacional</span>
        <span class="q">¿Qué está pasando ahora?</span>
        <span class="kv" id="home-tps-kv">—</span><span class="muted" style="font-size:.84rem">pedidos registrados hoy, en vivo</span>
        <span class="go">Abrir panel ${icon('arrowR')}</span>
      </button>
      <button type="button" class="sys-card" data-go="mis" style="--c:var(--lvl-mis)">
        <span class="lvl-chip" data-l="mis"><b>MIS</b>Gerencial</span>
        <span class="q">¿Cómo vamos frente al plan?</span>
        <span class="kv">${fmtEur(sep.rev)} ${deltaHtml(sep.rev / sepB - 1)}</span><span class="muted" style="font-size:.84rem">ventas de septiembre frente al presupuesto</span>
        <span class="go">Abrir panel ${icon('arrowR')}</span>
      </button>
      <button type="button" class="sys-card" data-go="dss" style="--c:var(--lvl-dss)">
        <span class="lvl-chip" data-l="dss"><b>DSS</b>Decisional</span>
        <span class="q">¿Qué pasaría si…?</span>
        <span class="kv">${npv >= 0 ? '+' : ''}${fmtEur(npv)}</span><span class="muted" style="font-size:.84rem">VAN a 3 años del Kit Accesible (escenario base)</span>
        <span class="go">Abrir panel ${icon('arrowR')}</span>
      </button>
      <button type="button" class="sys-card" data-go="ess" style="--c:var(--lvl-ess)">
        <span class="lvl-chip" data-l="ess"><b>ESS</b>Estratégico</span>
        <span class="q">¿Hacia dónde vamos?</span>
        <span class="kv">${fmtPct(ytd.rev / TARGET_2026, 0)}</span><span class="muted" style="font-size:.84rem">del objetivo anual 2026 (${fmtEur(TARGET_2026)}) ya conseguido</span>
        <span class="go">Abrir panel ${icon('arrowR')}</span>
      </button>
    </div>
  </section>

  <section class="stack" aria-labelledby="h-flow" id="home-flow">
    <div>
      <h2 id="h-flow">Un dato, cuatro niveles</h2>
      <p class="lead" style="margin-top:6px">En enero de 2026 añadimos al checkout una pregunta opcional: «¿Necesitas las instrucciones en un formato accesible?». Así viaja ese dato desde la transacción hasta la estrategia.</p>
    </div>
    <div class="flow">
      <button type="button" class="flow-step" data-go="tps" style="text-align:left;background:none;border:0;border-right:1px solid var(--line);cursor:pointer;font:inherit;color:inherit">
        <span class="lvl-chip" data-l="tps"><b>TPS</b>registra</span>
        <span class="big">1 campo</span>
        <p>Cada pedido guarda si el cliente pide letra grande, braille o lectura fácil. Es opcional y no pide datos de salud.</p>
      </button>
      <button type="button" class="flow-step" data-go="mis" data-go-opts='{"tab":"clientes"}' style="text-align:left;background:none;border:0;border-right:1px solid var(--line);cursor:pointer;font:inherit;color:inherit">
        <span class="lvl-chip" data-l="mis"><b>MIS</b>resume</span>
        <span class="big">${fmtN(accLast)} peticiones</span>
        <p>El informe de clientes muestra ${fmtN(accLast)} peticiones en septiembre, un ${signPct(accLast / accFirst - 1, 0)} desde enero.</p>
      </button>
      <button type="button" class="flow-step" data-go="dss" style="text-align:left;background:none;border:0;border-right:1px solid var(--line);cursor:pointer;font:inherit;color:inherit">
        <span class="lvl-chip" data-l="dss"><b>DSS</b>simula</span>
        <span class="big">VAN ${npv >= 0 ? '+' : ''}${fmtEur(npv)}</span>
        <p>El simulador usa esa demanda para decidir si lanzamos un Kit Accesible y a qué precio.</p>
      </button>
      <button type="button" class="flow-step" data-go="ess" style="text-align:left;background:none;border:0;cursor:pointer;font:inherit;color:inherit">
        <span class="lvl-chip" data-l="ess"><b>ESS</b>orienta</span>
        <span class="big">ODS 10</span>
        <p>La dirección sigue la accesibilidad (web ${D.customers.auditoria_web.slice(-1)[0][1]}/100, objetivo ${D.customers.objetivo_web}) como indicador estratégico.</p>
      </button>
    </div>
    <p class="callout neutral">${icon('info')}<span><b>La idea clave:</b> si el TPS no recoge un dato, ningún nivel superior podrá verlo. Por eso la inclusión empieza en el diseño de la transacción.</span></p>
  </section>

  <section class="grid g-7-5">
    <div class="card stack">
      <div><h2 style="font-size:1.3rem">Catálogo</h2><p class="card-sub">Ocho líneas de kits, montados en nuestras naves con componentes de 12 proveedores. PVP medio.</p></div>
      <div class="catalog">${D.lines.map((l) => `<div class="cat-item"><b>${esc(l.nombre)}</b><span>${fmtEur(l.pvp, { cents: false })} · ${esc(l.desc)}</span></div>`).join('')}</div>
    </div>
    <div class="stack">
      <div data-slot="channels"></div>
      <div class="card stack" style="gap:10px">
        <h3>Naves</h3>
        ${D.naves.map((n) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap">${icon(n.id === 'PAT' ? 'factory' : 'truck')}<div><b>${esc(n.nombre)}</b><p class="muted" style="font-size:.84rem">${esc(n.desc)}</p></div></div>`).join('')}
      </div>
    </div>
  </section>`);

  const pyr = frag('<div class="pyr"></div>');
  put(el, 'pyr', pyr);
  let lastW = 0;
  const drawP = () => { const w = pyr.clientWidth; if (w && w !== lastW) { lastW = w; drawPyramidNav(pyr, w); } };
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(drawP)).observe(pyr); else drawP();

  put(el, 'channels', chartCard({
    title: 'Peso de cada canal en 2026',
    sub: 'Ventas de enero a septiembre de 2026',
    easy: `Amazon es el canal que más vende (${fmtPct(ytdShare[1], 0)}), pero la venta a empresas ya supone el ${fmtPct(ytdShare[2], 0)}.`,
    table: { head: ['Canal', 'Ventas', 'Peso'], rows: D.channels.map((c, i) => [c.corto, fmtEur(ytd.byCh[i].rev), fmtPct(ytdShare[i])]), align: ['', 'r', 'r'] },
    draw: (c, w) => drawHBars(c, w, { rows: D.channels.map((ch, i) => ({ label: ch.corto, value: ytdShare[i], color: CH_COLORS[i], tex: i })), fmt: (v) => fmtPct(v, 0), max: 0.45 }),
  }));
  updateHomeLive();
};
function updateHomeLive() {
  const k = document.getElementById('home-tps-kv');
  if (k && typeof TPS !== 'undefined') k.textContent = fmtN(TPS.ordersToday());
}
Bus.on('tx', updateHomeLive);
