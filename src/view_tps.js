/* ===================================================================== view_tps.js
   TPS · jornada del 30/09/2026, generada pedido a pedido a partir del mix de septiembre. */

FICHAS.tps = {
  pregunta: '¿Qué está pasando ahora?',
  datos: 'Pedidos, líneas de pedido, órdenes de montaje y movimientos de stock por lote y caducidad',
  nivel: 'Operacional · decisiones estructuradas y repetitivas',
  usuarios: 'Operarios de montaje, almacén, atención al cliente y administración',
  frecuencia: 'Tiempo real, transacción a transacción',
  formato: 'Registros detallados, formularios, albaranes y alertas de stock',
  ejemplos: 'Pedidos de Amazon Seller Central · pedidos de farmacias por Fedicom · SGA con salida FEFO · trazabilidad por lote (Reglamento UE 2017/745)',
};

// etiquetas braille (lámina adhesiva para la tapa y los compartimentos): componente del kit accesible.
// Se añade aquí, en la vista, para no alterar la semilla de los datos simulados.
if (!D.components.some((c) => c.id === 'C18')) D.components.push({ id: 'C18', nombre: 'Etiquetas braille (lámina)', prov: 'S12', stock: 2600, consumo: 290, rop: 2900, ss: 1450, lote: 'EB-2609-01', cad: 'sin caducidad', sanitario: false });

const TPSDAY = (() => {
  const r = rng(20260930);
  const sep = agg([LAST], ALL);
  const days = [30, 30, 22, 22, 22];
  const exp = D.channels.map((c, i) => sep.byCh[i].orders / days[i]);
  const norm = (a) => { const s = sum(a); return a.map((x) => x / s); };
  const B2C = norm([0.8, 0.5, 0.3, 0.2, 0.2, 0.3, 0.7, 1.5, 2.5, 3.5, 4.2, 4.5, 4.6, 4.2, 3.8, 3.9, 4.0, 4.2, 4.6, 5.2, 6.0, 6.2, 5.0, 2.5]);
  const B2B = norm([0, 0, 0, 0, 0, 0, 0, 0.3, 2.5, 4.5, 5, 5, 4, 2, 3, 3.5, 3, 2, 0.8, 0.2, 0, 0, 0, 0]);
  const WH = [B2C, B2C, B2B, B2B, B2B];
  const mix = D.channels.map(() => ({ li: new Array(D.lines.length).fill(0), re: new Array(D.regions.length).fill(0) }));
  const price = {};
  FACTS_BY_M[LAST].forEach((f) => { mix[f[1]].li[f[2]] += f[4]; mix[f[1]].re[f[3]] += f[4]; const k = f[1] + '|' + f[2]; price[k] = price[k] || [0, 0]; price[k][0] += f[5]; price[k][1] += f[4]; });
  const orders = [];
  D.channels.forEach((ch, c) => {
    for (let h = 0; h < 24; h++) {
      const n = Math.round(exp[c] * WH[c][h] * lnorm(r, 0.12));
      for (let k = 0; k < n; k++) {
        const li = pickW(r, mix[c].li), re = pickW(r, mix[c].re);
        const units = c < 2 ? (r() < 0.78 ? 1 : r() < 0.8 ? 2 : 3) : Math.max(2, Math.round(ch.upo * lnorm(r, 0.45)));
        const p = price[c + '|' + li]; const unit = p ? p[0] / p[1] : D.lines[li].pvp * ch.price;
        orders.push({ minute: h * 60 + Math.floor(r() * 60), c, li, re, units, amount: Math.round(units * unit * 100) / 100 });
      }
    }
  });
  orders.sort((a, b) => a.minute - b.minute);
  orders.forEach((o, i) => {
    o.id = 'S0' + (48210 + i);
    o.status = o.minute >= 21 * 60 ? 'Recibido' : o.minute >= 17 * 60 + 30 ? 'En preparación' : 'Expedido';
  });
  const prodM = D.production.filter((p) => p[0] === LAST);
  const byLine = D.lines.map((_, li) => Math.round(sum(prodM.filter((p) => p[2] === li), (p) => p[3]) / 22 * (0.96 + r() * 0.05)));
  return { orders, plan: 3380, built: sum(byLine), byLine };
})();
const STATUS_LVL = { Recibido: 'info', 'En preparación': 'warn', Expedido: 'good' };
const TPS_UI = { hour: -1, status: '' };

function compState(c) {
  const st = c.stock - c.consumo;
  if (st <= c.ss) return ['crit', 'Crítico', 0];
  if (st <= c.rop) return ['warn', 'Reponer', 1];
  return ['good', 'Correcto', 2];
}
function soonExpiry(c) {
  if (!/^\d{4}-\d{2}$/.test(c.cad)) return false;
  const [y, m] = c.cad.split('-').map(Number);
  return (y - 2026) * 12 + (m - 9) <= 6;
}
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

RENDER.tps = function () {
  const f = S.f;
  const ords = TPSDAY.orders.filter((o) => (f.ch < 0 || o.c === f.ch) && (f.li < 0 || o.li === f.li) && (f.re < 0 || o.re === f.re));
  const byHour = range(0, 23).map((h) => ords.filter((o) => Math.floor(o.minute / 60) === h));
  let ca = 0; const cumAmount = byHour.map((l) => (ca += sum(l, (o) => o.amount)));
  let co = 0; const cumOrders = byHour.map((l) => (co += l.length));
  const amount = sum(ords, (o) => o.amount);
  const pending = ords.filter((o) => o.status !== 'Expedido').length;
  const crit = D.components.filter((c) => compState(c)[0] === 'crit').length, warn = D.components.filter((c) => compState(c)[0] === 'warn').length;
  const el = mount('view-tps', `<div class="report">
    ${reportHead('tps', 'Procesamiento de transacciones', slicersHtml(['ch', 'li', 're']), `<span class="stamp-in">Jornada del 30/09/2026</span>`)}
    <div class="kpis">
      ${kpiHtml({ l: 'Pedidos del día', v: fmtN(ords.length), spark: cumOrders })}
      ${kpiHtml({ l: 'Importe registrado', v: fmtEur(amount), d: `<span>ticket medio ${fmtEur(amount / Math.max(1, ords.length), { cents: true })}</span>`, spark: cumAmount })}
      ${kpiHtml({ l: 'Kits montados', v: fmtN(TPSDAY.built), d: statusChip(TPSDAY.built / TPSDAY.plan >= 0.98 ? 'good' : 'warn', `${fmtPct(TPSDAY.built / TPSDAY.plan, 0)} del plan`) })}
      ${kpiHtml({ l: 'Pendientes de expedir', v: fmtN(pending), d: `<span>${fmtPct(pending / Math.max(1, ords.length), 0)} de los pedidos</span>` })}
      ${kpiHtml({ l: 'Alertas de stock', v: fmtN(crit + warn), d: crit ? statusChip('crit', `${crit} crítico${crit > 1 ? 's' : ''}`) : statusChip('good', 'Sin roturas') })}
    </div>
    <div class="visuals">
      <div data-slot="hourly" class="span-2"></div>
      <div data-slot="lines"></div>
      <div data-slot="log" class="span-2"></div>
      <div data-slot="stock"></div>
    </div></div>`);
  bindSlicers(el, ['ch', 'li', 're']);

  const hourly = D.channels.map((_, c) => range(0, 23).map((h) => byHour[h].filter((o) => o.c === c).length));
  const chSeries = D.channels.map((ch, i) => ({ name: ch.corto, color: CH_COLORS[i], values: hourly[i] })).filter((s, i) => f.ch < 0 || i === f.ch);
  const hourlyTile = put(el, 'hourly', tile({
    title: 'Pedidos por hora y canal', cls: 'span-2',
    legend: chSeries.map((s) => ({ name: s.name, color: s.color, toggle: true })),
    alt: `${fmtN(ords.length)} pedidos a lo largo del día`,
    listen: () => {
      const tot = byHour.map((l) => l.length), hi = tot.indexOf(Math.max(...tot)), act = tot.map((v, h) => [v, h]).filter((x) => x[0] > 0), lo = act.reduce((m, x) => (x[0] < m[0] ? x : m), act[0] || [0, 0]);
      return { values: tot, summary: `Hoy se han registrado ${fmtN(ords.length)} pedidos. La hora punta son las ${hi}:00, con ${fmtN(tot[hi])} pedidos, y la más tranquila, las ${lo[1]}:00, con ${fmtN(lo[0])}. A continuación, los pedidos de cada hora en sonido, de las 0 a las 23 horas.` };
    },
    table: () => ({ head: ['Hora'].concat(chSeries.map((s) => s.name), ['Total']), rows: range(0, 23).map((h) => [`${h}:00`].concat(chSeries.map((s) => fmtN(s.values[h])), [fmtN(byHour[h].length)])), align: ['', ...chSeries.map(() => 'r'), 'r'] }),
    draw: (c, w, h, hid) => drawCols(c, w, h, {
      labels: range(0, 23).map((x) => String(x)), mode: 'stack', sel: TPS_UI.hour, hidden: hid,
      series: chSeries, yFmt: fmtN, tipTitle: (i) => `${i}:00 – ${i}:59`, xEvery: w < 520 ? 3 : w > 900 ? 1 : 2,
      hitLabel: 'Pedidos por hora: flechas para recorrer, Intro para filtrar la tabla',
      onClick: (i) => { TPS_UI.hour = TPS_UI.hour === i ? -1 : i; drawLog(); hourlyTile.redraw(); },
    }),
  }));
  const todayLine = D.lines.map((l, i) => ({ label: l.nombre, value: TPSDAY.byLine[i], color: 'var(--s1)', idx: i, dim: f.li >= 0 && f.li !== i })).sort((a, b) => b.value - a.value);
  put(el, 'lines', tile({
    title: 'Kits montados hoy por línea', aside: `${fmtN(TPSDAY.built)} / ${fmtN(TPSDAY.plan)}`,
    listen: () => ({ values: todayLine.map((r) => r.value), summary: `Hoy se han montado ${fmtN(TPSDAY.built)} kits de un plan de ${fmtN(TPSDAY.plan)}. ${sumRank(todayLine, (v) => fmtN(v) + ' kits')}` }),
    table: () => ({ head: ['Línea', 'Kits montados'], rows: todayLine.map((r) => [r.label, fmtN(r.value)]), align: ['', 'r'] }),
    draw: (c, w, h) => drawHBars(c, w, h, { rows: todayLine, fmt: fmtN, valueName: 'Kits montados', onClick: (r) => setFilter('li', r.idx) }),
  }));

  const counts = { Recibido: 0, 'En preparación': 0, Expedido: 0 };
  ords.forEach((o) => { counts[o.status]++; });
  const logTile = put(el, 'log', tile({
    title: 'Transacciones', cls: 'span-2',
    listen: () => ({ summary: `${fmtN(ords.length)} pedidos en la jornada: ${fmtN(counts.Expedido)} expedidos, ${fmtN(counts['En preparación'])} en preparación y ${fmtN(counts.Recibido)} recibidos.` }),
    aside: `<span class="chips" role="group" aria-label="Filtrar por estado">${Object.entries(counts).map(([k, v]) => `<button type="button" class="chip-btn" data-status="${k}" aria-pressed="${TPS_UI.status === k}"><i class="st-dot st-${STATUS_LVL[k]}"></i>${k} <b>${fmtN(v)}</b></button>`).join('')}</span>`,
    body: `<div class="tbl"><table class="t"><thead><tr><th>Hora</th><th>Pedido</th><th>Canal</th><th>Kit</th><th>Comunidad</th><th class="r">Uds.</th><th class="r">Importe</th><th>Estado</th></tr></thead><tbody id="log-body"></tbody></table></div><div class="tbl-foot" id="log-foot"></div>`,
  }));
  $$('[data-status]', logTile).forEach((b) => b.addEventListener('click', () => {
    TPS_UI.status = TPS_UI.status === b.dataset.status ? '' : b.dataset.status;
    $$('[data-status]', logTile).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.status === TPS_UI.status)));
    drawLog();
  }));
  function drawLog() {
    const rows = ords.filter((o) => (TPS_UI.hour < 0 || Math.floor(o.minute / 60) === TPS_UI.hour) && (!TPS_UI.status || o.status === TPS_UI.status)).slice().reverse();
    const rowHtml = (o) => `<tr><td class="num">${hhmm(o.minute)}</td><td class="num muted">${o.id}</td><td><i class="swatch" style="background:${CH_COLORS[o.c]}"></i>${esc(D.channels[o.c].corto)}</td><td>${esc(D.lines[o.li].nombre)}</td><td>${esc(D.regions[o.re].nombre)}</td><td class="r">${fmtN(o.units)}</td><td class="r">${dec(o.amount, 2)} €</td><td>${statusChip(STATUS_LVL[o.status], o.status)}</td></tr>`;
    // primero las 60 filas más recientes (el cambio de panel no espera a maquetar 250); el resto, cuando el navegador está libre
    const body = $('#log-body', logTile), rest = rows.slice(60, 250), token = (drawLog.token = (drawLog.token || 0) + 1);
    body.innerHTML = rows.slice(0, 60).map(rowHtml).join('');
    if (rest.length) (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(() => { if (drawLog.token === token && body.isConnected) body.insertAdjacentHTML('beforeend', rest.map(rowHtml).join('')); }, { timeout: 1200 });
    const foot = $('#log-foot', logTile);
    foot.innerHTML = `${fmtN(rows.length)} registros${TPS_UI.hour >= 0 ? ` · <span class="pill">${TPS_UI.hour}:00–${TPS_UI.hour}:59 <button type="button" aria-label="Quitar filtro de hora" id="log-clear">×</button></span>` : ''}`;
    const clr = $('#log-clear', logTile); if (clr) clr.addEventListener('click', () => { TPS_UI.hour = -1; drawLog(); hourlyTile.redraw(); });
  }
  drawLog();

  const comps = D.components.slice().sort((a, b) => compState(a)[2] - compState(b)[2] || (a.stock - a.consumo) / a.consumo - (b.stock - b.consumo) / b.consumo);
  put(el, 'stock', tile({
    title: 'Inventario de componentes', aside: `${crit + warn} alertas`,
    listen: () => {
      const of = (lv) => comps.filter((c) => compState(c)[0] === lv).map((c) => `${c.nombre}, con ${dec((c.stock - c.consumo) / c.consumo, 1)} días de cobertura`);
      const cr = of('crit'), wa = of('warn');
      return { summary: `${comps.length} componentes en almacén. ${cr.length ? `En estado crítico: ${cr.join('; ')}.` : 'Ninguno en estado crítico.'} ${wa.length ? `Por reponer: ${wa.join('; ')}.` : ''}` };
    },
    body: `<div class="tbl"><table class="t"><thead><tr><th>Componente</th><th class="r">Stock</th><th style="width:70px">Cobertura</th><th>Estado</th><th>Lote</th></tr></thead><tbody>${comps.map((c) => {
      const st = c.stock - c.consumo; const [lvl, txt] = compState(c); const days = st / c.consumo;
      return `<tr title="Caducidad ${esc(c.cad)}"><td>${esc(c.nombre)}${soonExpiry(c) ? ' <span class="badge-fefo" title="Caduca antes: sale primero (FEFO)">FEFO</span>' : ''}</td><td class="r">${fmtN(st)}</td><td><div class="cov"><span>${dec(days, 1)} d</span>${meterHtml(days / 20, { cls: lvl === 'crit' ? 'crit' : lvl === 'warn' ? 'warn' : '', label: `Cobertura ${dec(days, 1)} días` })}</div></td><td>${statusChip(lvl, txt)}</td><td class="num muted">${esc(c.lote)}</td></tr>`;
    }).join('')}</tbody></table></div>`,
  }));
};
