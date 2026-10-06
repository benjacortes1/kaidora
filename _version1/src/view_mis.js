/* ===================================================================== view_mis.js
   MIS: informes periódicos que resumen el TPS para los mandos intermedios. */

const FICHA_MIS = {
  datos: ['Datos internos <strong>resumidos</strong> del TPS: ventas, márgenes y devoluciones', 'Comparativas frente al presupuesto y al año anterior', 'Producción, OEE, entregas y proveedores', 'Plantilla desglosada por género, edad y discapacidad'],
  nivel: 'Gerencial (táctico)',
  nivelTxt: 'Decisiones semiestructuradas y recurrentes: reforzar un canal, cambiar de proveedor, ajustar turnos o formación.',
  usuarios: ['Jefes/as de producción, logística y compras', 'Responsables de venta B2B y de marketplaces', 'Responsable de personas (RR. HH.)', 'Control de gestión'],
  frecuencia: 'Diaria, semanal y cierre mensual',
  formato: 'Informes predefinidos, tablas resumen, comparativas contra plan y listados de excepciones.',
  ejemplos: ['Informes de negocio de Amazon Seller Central (ventas y sesiones por producto)', 'Informes de Odoo Ventas e Inventario agrupados por mes y canal', 'Registro retributivo por sexo, obligatorio en España (RD 902/2020)', 'Informe OTIF de proveedores para la reunión mensual de compras'],
  porque: 'Los mandos no pueden leer 30.000 pedidos al mes. El MIS resume el TPS en informes periódicos para comprobar si cada área cumple el plan y detectar excepciones a tiempo.',
};
const MIS_TABS = [['ventas', 'Ventas y canales'], ['operaciones', 'Operaciones y compras'], ['personas', 'Personas'], ['clientes', 'Clientes e inclusión']];
const INCIDENTS = [
  { li: 'dia', months: ['2026-03', '2026-04'], txt: 'Rotura de stock de tabletas de glucosa (GlucoCare Europe, OTIF 84 %). Acción: segundo proveedor homologado.' },
  { ch: 'web', months: ['2026-05', '2026-06'], txt: 'Caída de conversión tras cambiar la pasarela de pago. Acción: rediseño del checkout y pruebas A/B.' },
];
const eurAxis = (v) => (Math.abs(v) >= 1e6 ? dec(v / 1e6, 1) + ' M' : Math.abs(v) >= 1e3 ? dec(v / 1e3, 0) + ' k' : dec(v, 0));

function prodAgg(ms, li = -1) {
  const set = new Set(ms); const byN = [0, 0]; const byM = new Map(ms.map((t) => [t, [0, 0]]));
  D.production.forEach((p) => { if (!set.has(p[0]) || (li >= 0 && p[2] !== li)) return; byN[p[1]] += p[3]; byM.get(p[0])[p[1]] += p[3]; });
  if (set.has(LAST) && typeof TPS !== 'undefined') { byN[0] += TPS.prod.extra[0]; byN[1] += TPS.prod.extra[1]; }
  return { total: byN[0] + byN[1], byN, byM };
}
const oeeOf = (o) => o[2] * o[3] * o[4];
function oeeAvg(ms, n = -1) {
  const set = new Set(ms); let w = 0, s = 0;
  D.oee.forEach((o) => { if (!set.has(o[0]) || (n >= 0 && o[1] !== n)) return; s += oeeOf(o) * o[5]; w += o[5]; });
  return w ? s / w : null;
}
function oeeSeries(n) { return D.months.map((_, t) => { const o = D.oee.find((x) => x[0] === t && x[1] === n); return o ? oeeOf(o) : null; }); }

RENDER.mis = function () {
  const el = mount('view-mis', `
    ${panelHead({ l: 'mis', levelName: 'Nivel gerencial', title: 'MIS · Sistema de información gerencial', q: '¿Cómo vamos frente al plan y qué se está desviando?', extra: propagation() })}
    ${fichaHtml(FICHA_MIS)}
    <div class="tabs-row">
      <div class="seg" role="tablist" aria-label="Informes del MIS">${MIS_TABS.map(([id, t]) => `<button type="button" role="tab" id="mis-tab-${id}" aria-selected="${S.misTab === id}" aria-controls="mis-body" data-mistab="${id}">${t}</button>`).join('')}</div>
      <span class="muted" style="font-size:.86rem" id="mis-scope"></span>
    </div>
    <div id="mis-body" role="tabpanel" class="stack" style="gap:18px"></div>`);
  $$('[data-mistab]', el).forEach((b) => {
    b.addEventListener('click', () => { S.misTab = b.dataset.mistab; RENDER.mis({ keep: true }); const t = $('#mis-tab-' + S.misTab); t && t.focus(); });
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault(); const i = MIS_TABS.findIndex(([id]) => id === S.misTab);
      S.misTab = MIS_TABS[(i + (e.key === 'ArrowRight' ? 1 : MIS_TABS.length - 1)) % MIS_TABS.length][0];
      RENDER.mis({ keep: true }); $('#mis-tab-' + S.misTab).focus();
    });
  });
  const body = $('#mis-body');
  ({ ventas: misVentas, operaciones: misOps, personas: misPersonas, clientes: misClientes })[S.misTab](body);
};

/* ---------------------------------------------------------------- informe de ventas */
function misVentas(body) {
  const per = periodObj(), ms = per.months, pm = prevMonths(ms);
  const a = agg(ms), p = pm ? agg(pm) : null, b = budgetFor(ms);
  $('#mis-scope').textContent = `${per.label} · ${filterText()}`;
  const margin = a.rev ? a.contrib / a.rev : 0, pMargin = p && p.rev ? p.contrib / p.rev : null;
  const retRate = a.units ? a.ret / a.units : 0, pRet = p && p.units ? p.ret / p.units : null;
  body.innerHTML = `
    <div class="kpis">
      ${kpiHtml({ label: 'Ventas netas', value: fmtEur(a.rev), delta: b ? deltaHtml(a.rev / b - 1, { suffix: ' vs presupuesto' }) : '<span class="muted">sin presupuesto para este filtro</span>', foot: p ? `${signPct(a.rev / p.rev - 1)} vs año anterior` : '' })}
      ${kpiHtml({ label: 'Kits vendidos', value: fmtN(a.units), delta: p ? deltaHtml(a.units / p.units - 1, { suffix: ' vs año anterior' }) : '' })}
      ${kpiHtml({ label: 'Pedidos (estimados)', value: fmtN(a.orders), foot: `ticket medio ${fmtEur(a.rev / Math.max(1, a.orders), { cents: true })}` })}
      ${kpiHtml({ label: 'Margen de contribución', value: fmtPct(margin), delta: pMargin != null ? deltaHtml(margin - pMargin, { pp: true, suffix: ' vs año anterior' }) : '', foot: 'tras producto, comisiones y logística' })}
      ${kpiHtml({ label: 'Tasa de devolución', value: fmtPct(retRate, 2), delta: pRet != null ? deltaHtml(retRate - pRet, { pp: true, goodUp: false, d: 2 }) : '', foot: 'unidades devueltas / vendidas' })}
    </div>
    <div data-slot="trend"></div>
    <div class="grid g3">
      <div data-slot="bych"></div><div data-slot="byli"></div><div data-slot="byco"></div>
    </div>
    <section class="card" id="mis-exc" aria-labelledby="h-exc">
      <div class="card-head"><div><h3 id="h-exc">Informe de excepciones</h3><p class="card-sub">Solo lo que se desvía: canales frente a presupuesto, líneas frente al año anterior y devoluciones altas. Pulsa una fila para filtrar el informe.</p></div></div>
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Ámbito</th><th scope="col">Indicador</th><th scope="col" class="r">Valor</th><th scope="col" class="r">Referencia</th><th scope="col">Estado</th><th scope="col">Causa probable y acción</th></tr></thead><tbody id="exc-body"></tbody></table></div>
    </section>`;

  // tendencia mensual (histórico completo con el periodo sombreado)
  const all = agg(range(0, LAST));
  const real = range(0, LAST).map((t) => all.byM.get(t).rev);
  const bud = budgetByM(range(0, LAST));
  put(body, 'trend', chartCard({
    id: 'mis-trend',
    title: 'Ventas mensuales frente al presupuesto',
    sub: `${filterText()} · la zona sombreada es el periodo seleccionado. Pulsa un mes para ver sus transacciones (TPS).`,
    legend: [{ name: 'Ventas reales', color: 'var(--s1)', key: 'line' }].concat(bud ? [{ name: 'Presupuesto', color: 'var(--ink-2)', key: 'line', dash: true }] : []),
    easy: bud ? `En ${mLabel(LAST, 'long')} vendimos ${fmtEur(real[LAST])}, un ${signPct(real[LAST] / bud[LAST] - 1)} frente a lo presupuestado. Las ventas suben cada año y tienen picos en verano y en Navidad.` : `En ${mLabel(LAST, 'long')} vendimos ${fmtEur(real[LAST])}. El presupuesto solo existe por canal, por eso no aparece con este filtro.`,
    table: { head: ['Mes', 'Ventas', 'Presupuesto', 'Desviación'], rows: range(0, LAST).map((t) => [mLabel(t, 'long'), fmtEur(real[t], { full: true }), bud ? fmtEur(bud[t], { full: true }) : '—', bud ? signPct(real[t] / bud[t] - 1) : '—']), align: ['', 'r', 'r', 'r'] },
    draw: (c, w) => drawLine(c, w, {
      labels: range(0, LAST).map((t) => mLabel(t)), h: 280, yFmt: eurAxis,
      series: [{ name: 'Ventas reales', color: 'var(--s1)', values: real, area: true, fmt: (v) => fmtEur(v) }].concat(bud ? [{ name: 'Presupuesto', color: 'var(--ink-2)', values: bud, dash: true, fmt: (v) => fmtEur(v), noLabel: true }] : []),
      bands: [{ from: ms[0], to: ms[ms.length - 1] }],
      tipTitle: (i) => mLabel(i, 'long'),
      tipExtra: (i) => (bud ? [{ name: 'Desviación', value: signPct(real[i] / bud[i] - 1) }] : []),
      onClick: (i) => drillMonth(i),
    }),
  }));
  const chRows = D.channels.map((c, i) => ({ label: c.corto, value: a.byCh[i].rev, color: CH_COLORS[i], tex: i, target: b ? sum(ms, (t) => BUDGET[t][i]) : null, targetLabel: 'Presupuesto', dim: S.f.ch >= 0 && S.f.ch !== i, idx: i }));
  put(body, 'bych', chartCard({
    title: 'Por canal', sub: b ? 'Barra: real · marca negra: presupuesto' : 'Ventas del periodo',
    easy: (() => { const best = chRows.slice().sort((x, y) => y.value - x.value)[0]; return `${best.label} es el canal que más vende en el periodo (${fmtEur(best.value)}).`; })(),
    table: { head: ['Canal', 'Ventas', 'Presupuesto'], rows: chRows.map((r) => [r.label, fmtEur(r.value, { full: true }), r.target ? fmtEur(r.target, { full: true }) : '—']), align: ['', 'r', 'r'] },
    draw: (c, w) => drawHBars(c, w, { rows: chRows, fmt: (v) => fmtEur(v), valueName: 'Ventas', onClick: (r) => { S.f.ch = S.f.ch === r.idx ? -1 : r.idx; syncFilterUI(); store('filters', S.f); rerender(); }, ariaRow: 'Filtrar el informe por este canal' }),
  }));
  const liRows = D.lines.map((l, i) => ({ label: l.nombre, value: a.byLi[i].rev, color: 'var(--s1)', dim: S.f.li >= 0 && S.f.li !== i, idx: i, yoy: p && p.byLi[i].rev ? a.byLi[i].rev / p.byLi[i].rev - 1 : null })).sort((x, y) => y.value - x.value);
  liRows.forEach((r) => { r.tip = [{ name: 'Ventas', value: fmtEur(r.value), color: 'var(--s1)', key: 'rect' }].concat(r.yoy != null ? [{ name: 'vs año anterior', value: signPct(r.yoy) }] : []); });
  put(body, 'byli', chartCard({
    title: 'Por línea de kit', sub: 'Ordenado de mayor a menor · pulsa para filtrar',
    easy: `${liRows[0].label} es la línea que más factura; ${liRows[liRows.length - 1].label} la que menos.`,
    table: { head: ['Línea', 'Ventas', 'vs año anterior'], rows: liRows.map((r) => [r.label, fmtEur(r.value, { full: true }), r.yoy != null ? signPct(r.yoy) : '—']), align: ['', 'r', 'r'] },
    draw: (c, w) => drawHBars(c, w, { rows: liRows, fmt: (v) => fmtEur(v), onClick: (r) => { S.f.li = S.f.li === r.idx ? -1 : r.idx; syncFilterUI(); store('filters', S.f); rerender(); }, ariaRow: 'Filtrar el informe por esta línea', rowH: 30, thick: 12 }),
  }));
  const coRows = D.countries.map((c, i) => ({ label: c.nombre, value: a.byCo[i].rev, color: 'var(--s1)', dim: S.f.co >= 0 && S.f.co !== i, idx: i, yoy: p && p.byCo[i].rev ? a.byCo[i].rev / p.byCo[i].rev - 1 : null })).sort((x, y) => y.value - x.value);
  coRows.forEach((r) => { r.tip = [{ name: 'Ventas', value: fmtEur(r.value), color: 'var(--s1)', key: 'rect' }].concat(r.yoy != null ? [{ name: 'vs año anterior', value: signPct(r.yoy) }] : []); });
  const intl = a.rev ? 1 - a.byCo[0].rev / a.rev : 0;
  put(body, 'byco', chartCard({
    title: 'Por país', sub: 'Ventas del periodo · pulsa para filtrar',
    easy: `El ${fmtPct(intl, 0)} de las ventas se hace fuera de España, sobre todo a través de Amazon.`,
    table: { head: ['País', 'Ventas', 'vs año anterior'], rows: coRows.map((r) => [r.label, fmtEur(r.value, { full: true }), r.yoy != null ? signPct(r.yoy) : '—']), align: ['', 'r', 'r'] },
    draw: (c, w) => drawHBars(c, w, { rows: coRows, fmt: (v) => fmtEur(v), onClick: (r) => { S.f.co = S.f.co === r.idx ? -1 : r.idx; syncFilterUI(); store('filters', S.f); rerender(); }, ariaRow: 'Filtrar el informe por este país' }),
  }));
  // excepciones
  const exc = [];
  const inPeriod = (mk) => ms.some((t) => D.months[t] === mk);
  const flt0 = { ch: -1, li: S.f.li, co: S.f.co };
  D.channels.forEach((c, i) => {
    if (S.f.ch >= 0 && S.f.ch !== i) return;
    if (S.f.li < 0 && S.f.co < 0) {
      const bud = sum(ms, (t) => BUDGET[t][i]); const d = a.byCh[i].rev / bud - 1;
      const inc = INCIDENTS.find((x) => x.ch === c.id && x.months.some(inPeriod));
      if (d < -0.02 || d > 0.05 || inc) exc.push({ scope: c.corto, kind: 'Canal', ind: 'Ventas vs presupuesto', val: fmtEur(a.byCh[i].rev), ref: fmtEur(bud), lvl: d < -0.08 ? 'crit' : d < -0.02 ? 'warn' : 'good', st: d < -0.02 ? `${signPct(d)} bajo plan` : d > 0.05 ? `${signPct(d)} sobre plan` : 'En plan', why: inc ? inc.txt : d > 0.05 ? 'Por encima del plan: revisar si hay que ampliar capacidad o stock.' : 'Revisar tráfico, precio y disponibilidad con el equipo del canal.', f: { ch: i }, sev: d });
    }
    const rr = a.byCh[i].units ? a.byCh[i].ret / a.byCh[i].units : 0;
    if (rr > 0.03) exc.push({ scope: c.corto, kind: 'Canal', ind: 'Tasa de devolución', val: fmtPct(rr, 2), ref: '≤ 3,00 %', lvl: rr > 0.04 ? 'crit' : 'warn', st: 'Por encima del umbral', why: c.id === 'amz' ? 'Devoluciones de Amazon por «no lo necesitaba». Acción: fotos del contenido y guía de tallas del kit.' : 'Revisar motivos de devolución en el TPS.', f: { ch: i }, sev: -rr });
  });
  if (p) {
    D.lines.forEach((l, i) => {
      if (S.f.li >= 0 && S.f.li !== i) return;
      const aa = agg(ms, Object.assign({}, S.f, { li: i })).rev, pp = agg(pm, Object.assign({}, S.f, { li: i })).rev;
      if (!pp) return;
      const d = aa / pp - 1; const inc = INCIDENTS.find((x) => x.li === l.id && x.months.some(inPeriod));
      if (d < 0.02 || inc) exc.push({ scope: l.nombre, kind: 'Línea', ind: 'Ventas vs año anterior', val: fmtEur(aa), ref: fmtEur(pp), lvl: d < -0.1 ? 'crit' : d < 0.02 ? 'warn' : 'info', st: `${signPct(d)} interanual`, why: inc ? inc.txt : 'Crecimiento por debajo de la media de la empresa. Revisar surtido y visibilidad.', f: { li: i }, sev: d });
    });
  }
  void flt0;
  exc.sort((x, y) => x.sev - y.sev);
  $('#exc-body').innerHTML = exc.length ? exc.map((e, i) => `<tr data-exc="${i}" tabindex="0" style="cursor:pointer" aria-label="Filtrar por ${esc(e.scope)}"><td><b>${esc(e.scope)}</b><br><span class="muted" style="font-size:.78rem">${e.kind}</span></td><td>${e.ind}</td><td class="r">${e.val}</td><td class="r">${e.ref}</td><td>${statusChip(e.lvl, e.st)}</td><td style="font-size:.84rem;max-width:42ch">${esc(e.why)}</td></tr>`).join('') : `<tr><td colspan="6">${statusChip('good', 'Sin excepciones')} <span class="muted">Todo está dentro de los márgenes en este periodo y filtro.</span></td></tr>`;
  $$('#exc-body tr[data-exc]').forEach((tr) => {
    const e = exc[+tr.dataset.exc];
    const act = () => { Object.assign(S.f, e.f); syncFilterUI(); store('filters', S.f); rerender(); toast('Filtro aplicado', `El informe muestra ahora: ${filterText()}.`, 'search'); };
    tr.addEventListener('click', act); tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') act(); });
  });
}

/* ---------------------------------------------------------------- drill-down: mes -> transacciones del TPS */
function drillMonth(t, origin = 'MIS') {
  const flt = S.f; const a = agg([t], flt);
  const r = rng(9000 + t * 31 + (flt.ch + 2) * 7 + (flt.li + 2) * 13 + (flt.co + 2) * 17);
  const rows = (t === LAST ? FACTS_BY_M[t].concat(S.extra) : FACTS_BY_M[t]).filter((f) => matches(f, flt));
  const weights = rows.map((f) => f[4] / D.channels[f[1]].upo);
  const y = mYear(t), m = mMonth(t), dim = new Date(y, m, 0).getDate();
  const sample = [];
  for (let i = 0; i < 25 && rows.length; i++) {
    const f = rows[pickW(r, weights)]; const c = f[1];
    const units = c < 2 ? (r() < 0.78 ? 1 : 2) : Math.max(2, Math.round(D.channels[c].upo * lnorm(r, 0.4)));
    const day = 1 + Math.floor(r() * dim), mins = Math.floor(r() * 1440);
    sample.push({ date: new Date(y, m - 1, day, Math.floor(mins / 60), mins % 60), id: 'S0' + (20000 + Math.floor(r() * 21000) + t * 700), c, li: f[2], k: f[3], units, amount: units * f[5] / f[4] });
  }
  sample.sort((p, q) => q.date - p.date);
  const pathHtml = `<span class="lvl-chip" data-l="ess"><b>ESS</b></span><span class="sep">›</span><span class="lvl-chip" data-l="mis"><b>MIS</b>${esc(mLabel(t, 'long'))}</span><span class="sep">›</span><span class="lvl-chip" data-l="tps"><b>TPS</b>transacciones</span>`;
  const body = frag(`<div class="stack" style="gap:16px">
    <p class="ink2" style="font-size:.92rem">El MIS muestra un total mensual; el TPS guarda cada pedido que lo forma. Estos son los datos agregados de <b>${esc(mLabel(t, 'long'))}</b> (${esc(filterText())}) y una muestra de las transacciones de las que salen.</p>
    <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${kpiHtml({ label: 'Ventas del mes', value: fmtEur(a.rev) })}
      ${kpiHtml({ label: 'Pedidos (estimados)', value: fmtN(a.orders) })}
      ${kpiHtml({ label: 'Kits vendidos', value: fmtN(a.units) })}
      ${kpiHtml({ label: 'Ticket medio', value: fmtEur(a.rev / Math.max(1, a.orders), { cents: true }) })}
    </div>
    <div><h3 style="margin-bottom:8px">Muestra de 25 transacciones</h3>
    <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Fecha</th><th scope="col">Pedido</th><th scope="col">Canal</th><th scope="col">Kit</th><th scope="col" class="r">Uds.</th><th scope="col" class="r">Importe</th></tr></thead>
    <tbody>${sample.map((s) => `<tr><td class="num">${s.date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} ${String(s.date.getHours()).padStart(2, '0')}:${String(s.date.getMinutes()).padStart(2, '0')}</td><td class="mono">${s.id}</td><td><i class="swatch" style="background:${CH_COLORS[s.c]}"></i>${esc(D.channels[s.c].corto)}</td><td>${esc(D.lines[s.li].nombre)}</td><td class="r">${fmtN(s.units)}</td><td class="r">${dec(s.amount, 2)} €</td></tr>`).join('')}</tbody></table></div></div>
    <div class="row"><button type="button" class="btn btn-primary" data-go="tps">${icon('bolt')}Ver el TPS en vivo</button><span class="muted" style="font-size:.84rem">Muestra generada con semilla fija a partir del mix real del mes.</span></div>
  </div>`);
  Drawer.open({ title: `Detalle de ${mLabel(t, 'long')}`, path: pathHtml, body });
  void origin;
}

/* ---------------------------------------------------------------- informe de operaciones */
function misOps(body) {
  const per = periodObj(), ms = per.months;
  $('#mis-scope').textContent = `${per.label} · ${S.f.li >= 0 ? D.lines[S.f.li].nombre : 'todas las líneas'} (canal y país no aplican a producción)`;
  const pr = prodAgg(ms, S.f.li), oee = oeeAvg(ms);
  const opsR = D.ops.filter((o) => ms.includes(o[0]));
  const otif = mean(opsR.map((o) => o[4])), lead = mean(opsR.map((o) => o[5])), edi = mean(opsR.map((o) => o[2])), rec = opsR.length ? opsR[opsR.length - 1][1] : 0;
  const acc = sum(opsR, (o) => o[3]);
  body.innerHTML = `
    <div class="kpis">
      ${kpiHtml({ label: 'Kits montados', value: fmtN(pr.total), foot: `Paterna ${fmtPct(pr.byN[0] / Math.max(1, pr.total), 0)} · Riba-roja ${fmtPct(pr.byN[1] / Math.max(1, pr.total), 0)}` })}
      ${kpiHtml({ label: 'OEE medio de montaje', value: fmtPct(oee), foot: statusChip(oee >= 0.85 ? 'good' : oee >= 0.75 ? 'warn' : 'crit', 'objetivo 85 %') })}
      ${kpiHtml({ label: 'Entregas a tiempo y completas (OTIF)', value: fmtPct(otif), foot: statusChip(otif >= 0.95 ? 'good' : 'warn', 'objetivo 95 %') })}
      ${kpiHtml({ label: 'Plazo medio de entrega', value: dec(lead, 1), unit: ' h', foot: 'desde el pedido hasta la entrega (España)' })}
      ${kpiHtml({ label: 'Accidentes con baja', value: fmtN(acc), foot: acc ? statusChip('warn', 'investigar causas') : statusChip('good', 'cero en el periodo') })}
    </div>
    <div class="grid g2"><div data-slot="oee"></div><div data-slot="prod"></div></div>
    <section class="card" aria-labelledby="h-sup" id="mis-sup">
      <div class="card-head"><div><h3 id="h-sup">Informe de proveedores</h3><p class="card-sub">Gasto de 2026 (ene–sep), puntualidad (OTIF) y plazo. Ordenado de peor a mejor OTIF.</p></div><span class="tag">${icon('truck')}Odoo · Compras</span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Proveedor</th><th scope="col">Categoría</th><th scope="col" class="r">Gasto 2026</th><th scope="col" class="r">OTIF</th><th scope="col" class="r">Plazo</th><th scope="col" class="r">Incidencias</th><th scope="col">Etiquetas</th></tr></thead>
      <tbody>${D.suppliers.slice().sort((x, y) => x.otif - y.otif).map((s) => `<tr><td><b>${esc(s.nombre)}</b><br><span class="muted" style="font-size:.78rem">${esc(s.ciudad)}</span></td><td style="font-size:.84rem">${esc(s.cat)}</td><td class="r">${fmtEur(s.gasto_2026)}</td><td class="r">${statusChip(s.otif >= 0.95 ? 'good' : s.otif >= 0.9 ? 'warn' : 'crit', fmtPct(s.otif, 0))}</td><td class="r">${s.lead} d</td><td class="r">${s.incidencias_2026}</td><td>${s.local ? '<span class="tag">Local</span> ' : ''}${s.cee ? '<span class="tag brand">Centro Especial de Empleo</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted" style="font-size:.84rem;margin-top:10px">Compra local (Comunitat Valenciana): <b>${fmtPct(sum(D.suppliers.filter((s) => s.local), (s) => s.gasto_2026) / sum(D.suppliers, (s) => s.gasto_2026), 0)}</b> del gasto · Economía social (CEE): <b>${fmtEur(sum(D.suppliers.filter((s) => s.cee), (s) => s.gasto_2026))}</b> · Pedidos recibidos electrónicamente: <b>${fmtPct(edi, 0)}</b> · Envase reciclado: <b>${fmtPct(rec, 0)}</b></p>
    </section>`;
  const s0 = oeeSeries(0), s1 = oeeSeries(1);
  const i25 = D.months.indexOf('2025-10');
  put(body, 'oee', chartCard({
    id: 'mis-oee',
    title: 'OEE mensual por nave',
    sub: 'Disponibilidad × rendimiento × calidad de las líneas de montaje',
    legend: [{ name: 'Nave Paterna', color: 'var(--s1)', key: 'line' }, { name: 'Nave Riba-roja', color: 'var(--s2)', key: 'line' }],
    easy: `Riba-roja empezó con un OEE bajo (${fmtPct(s1[6], 0)}) y dio un salto con la línea semiautomática de octubre de 2025: hoy está en ${fmtPct(s1[LAST], 0)}, por encima de Paterna (${fmtPct(s0[LAST], 0)}).`,
    table: { head: ['Mes', 'Paterna', 'Riba-roja'], rows: D.months.map((_, t) => [mLabel(t, 'long'), s0[t] != null ? fmtPct(s0[t]) : '—', s1[t] != null ? fmtPct(s1[t]) : '—']), align: ['', 'r', 'r'] },
    draw: (c, w) => drawLine(c, w, {
      labels: D.months.map((_, t) => mLabel(t)), h: 250, yFmt: (v) => fmtPct(v, 0), zero: false, yMin: 0.55, yMax: 0.9,
      series: [{ name: 'Nave Paterna', color: 'var(--s1)', values: s0 }, { name: 'Nave Riba-roja', color: 'var(--s2)', values: s1 }],
      refs: [{ v: 0.85, label: 'Objetivo 85 %' }], notes: [{ i: i25, s: 1, label: 'Línea semiautomática' }], tipTitle: (i) => mLabel(i, 'long'),
    }),
  }));
  const pms = ms.length >= 6 ? ms : range(LAST - 11, LAST);
  put(body, 'prod', chartCard({
    title: 'Kits montados por mes y nave',
    sub: `${ms.length >= 6 ? per.label : 'Últimos 12 meses'} · ${S.f.li >= 0 ? D.lines[S.f.li].nombre : 'todas las líneas'}`,
    legend: [{ name: 'Nave Paterna', color: 'var(--s1)' }, { name: 'Nave Riba-roja', color: 'var(--s2)' }],
    easy: 'La producción sube en septiembre y octubre para acumular stock antes de Black Friday y Navidad.',
    table: { head: ['Mes', 'Paterna', 'Riba-roja'], rows: pms.map((t) => { const v = prodAgg([t], S.f.li).byN; return [mLabel(t, 'long'), fmtN(v[0]), fmtN(v[1])]; }), align: ['', 'r', 'r'] },
    draw: (c, w) => {
      const vals = pms.map((t) => prodAgg([t], S.f.li).byN);
      drawCols(c, w, { labels: pms.map((t) => mLabel(t)), mode: 'stack', h: 250, yFmt: (v) => (v >= 1000 ? dec(v / 1000, 0) + ' k' : dec(v, 0)), fmt: fmtN, series: [{ name: 'Nave Paterna', color: 'var(--s1)', values: vals.map((v) => v[0]) }, { name: 'Nave Riba-roja', color: 'var(--s2)', values: vals.map((v) => v[1]) }], tipTitle: (i) => mLabel(pms[i], 'long') });
    },
  }));
}

/* ---------------------------------------------------------------- informe de personas */
function misPersonas(body) {
  $('#mis-scope').textContent = 'Plantilla a 30/09/2026 · los filtros de ventas no aplican';
  const hr = D.hr; const lastHr = hr[hr.length - 1], yAgo = hr[hr.length - 13];
  const leadersPct = HR.leadersW / HR.leaders.length;
  const discPct = HR.disc / HR.total;
  const bands = AGE_BANDS.map((b) => b[0]);
  const pyr = (g) => AGE_BANDS.map((_, i) => EMP.filter((e) => e.genero === g && ageBand(e.edad) === i).length);
  const levels = ['dir', 'mi', 'tec', 'op'];
  const byLevel = levels.map((l) => ({ label: D.levels[l], w: EMP.filter((e) => e.nivel === l && e.genero === 'M').length, h: EMP.filter((e) => e.nivel === l && e.genero === 'H').length }));
  const salLevels = ['mi', 'tec', 'op'];
  const salLevel = salLevels.map((l) => {
    const w = EMP.filter((e) => e.nivel === l && e.genero === 'M'), h = EMP.filter((e) => e.nivel === l && e.genero === 'H');
    return { w: mean(w.map(fte)), h: mean(h.map(fte)), nw: w.length, nh: h.length };
  });
  const form = AGE_BANDS.map((_, i) => mean(EMP.filter((e) => ageBand(e.edad) === i).map((e) => e.formacion)));
  const formAvg = mean(EMP.map((e) => e.formacion));
  body.innerHTML = `
    <div class="kpis">
      ${kpiHtml({ label: 'Plantilla', value: fmtN(HR.total), delta: deltaHtml(lastHr[1] / yAgo[1] - 1, { suffix: ' en 12 meses' }), foot: `${HR.women} mujeres · ${HR.men} hombres · ${HR.other} no binarias o sin indicar` })}
      ${kpiHtml({ label: 'Mujeres en puestos de mando', value: fmtPct(leadersPct, 0), foot: `${HR.leadersW} de ${HR.leaders.length} (dirección y mandos) · ${fmtPct(HR.women / HR.total, 0)} en toda la plantilla` })}
      ${kpiHtml({ label: 'Brecha salarial media', value: fmtPct(HR.gap), foot: `a jornada completa · ajustada por puesto: ${fmtPct(HR.gapAdj)}` })}
      ${kpiHtml({ label: 'Personas con discapacidad', value: fmtN(HR.disc), unit: ` (${fmtPct(discPct)})`, foot: statusChip(discPct >= 0.02 ? 'good' : 'crit', 'cuota legal: 2 %') })}
      ${kpiHtml({ label: 'Edad media', value: dec(HR.avgAge, 1), unit: ' años', foot: `${HR.over55} personas de 55 años o más · ${HR.under30} menores de 30` })}
      ${kpiHtml({ label: 'Absentismo (septiembre)', value: fmtPct(lastHr[2]), foot: `rotación voluntaria: ${fmtPct(lastHr[3])}` })}
    </div>
    <div class="grid g2"><div data-slot="pyr"></div><div data-slot="lvl"></div></div>
    <div class="grid g2"><div data-slot="sal"></div><div data-slot="form"></div></div>
    <div class="grid g-7-5">
      <div data-slot="abs"></div>
      <section class="card stack" style="gap:12px" aria-labelledby="h-disc" id="mis-disc">
        <h3 id="h-disc">Discapacidad e integración laboral</h3>
        <div><div class="row" style="justify-content:space-between"><span>Plantilla con discapacidad reconocida (≥ 33 %)</span><b>${fmtPct(discPct)}</b></div>${meterHtml(discPct / 0.05, { tick: 0.02 / 0.05, label: 'Porcentaje de plantilla con discapacidad frente a la cuota del 2 %' })}<span class="muted" style="font-size:.78rem">La marca indica la cuota legal del 2 % para empresas de 50 o más personas (RDL 1/2013).</span></div>
        <p class="ink2" style="font-size:.9rem">Además, compramos manipulado, etiquetado y folletos en lectura fácil a un <b>Centro Especial de Empleo</b> (${fmtEur(sum(D.suppliers.filter((s) => s.cee), (s) => s.gasto_2026))} en 2026). Tres puestos cuentan con adaptaciones: avisos luminosos en la línea de montaje, lector de pantalla en atención al cliente y horario flexible.</p>
        <p class="muted" style="font-size:.84rem">El dato de discapacidad es de salud: solo lo ve el equipo de personas, se guarda con consentimiento y se publica agregado.</p>
      </section>
    </div>
    <div class="callout">${icon('shield')}<div><h4>Privacidad por diseño</h4><p>Cuando un informe cruza un dato sensible (salario, discapacidad o identidad de género) no muestra grupos de menos de 5 personas. Por eso el salario de la dirección no se desglosa por género, y las ${HR.other} personas no binarias o que prefieren no indicar su género cuentan en el total pero no aparecen por separado. Las personas se identifican con códigos seudonimizados (E001…E150).</p></div></div>`;
  put(body, 'pyr', chartCard({
    title: 'Pirámide de edad por género', sub: 'Número de personas en cada tramo de edad',
    easy: `La mayoría de la plantilla tiene entre 25 y 54 años. Hay ${HR.over55} personas de 55 o más, un colectivo que debemos cuidar en formación digital.`,
    table: { head: ['Tramo', 'Mujeres', 'Hombres'], rows: bands.map((b, i) => [b, pyr('M')[i], pyr('H')[i]]), align: ['', 'r', 'r'] },
    draw: (c, w) => drawPyramid(c, w, { bands, left: { name: 'Mujeres', color: 'var(--g-m)', values: pyr('M') }, right: { name: 'Hombres', color: 'var(--g-h)', values: pyr('H') }, fmt: fmtN }),
  }));
  put(body, 'lvl', chartCard({
    id: 'mis-glass',
    title: 'Mujeres y hombres por nivel', sub: 'Porcentaje dentro de cada nivel jerárquico',
    legend: [{ name: 'Mujeres', color: 'var(--g-m)' }, { name: 'Hombres', color: 'var(--g-h)' }],
    easy: `Las mujeres son casi la mitad de la plantilla, pero solo el ${fmtPct(leadersPct, 0)} de los puestos de mando. Es el llamado «techo de cristal».`,
    table: { head: ['Nivel', 'Mujeres', 'Hombres'], rows: byLevel.map((r) => [r.label, r.w, r.h]), align: ['', 'r', 'r'] },
    draw: (c, w) => drawStack100(c, w, { rows: byLevel.map((r) => ({ label: r.label, parts: [r.w, r.h] })), series: [{ name: 'Mujeres', color: 'var(--g-m)', ink: '#fff' }, { name: 'Hombres', color: 'var(--g-h)', ink: '#1a0d06' }], fmtVal: (v) => `${v} personas` }),
  }));
  put(body, 'sal', chartCard({
    title: 'Salario medio a jornada completa por nivel', sub: 'Euros brutos anuales a jornada completa. La dirección (5 personas) no se desglosa para proteger su privacidad.',
    legend: [{ name: 'Mujeres', color: 'var(--g-m)' }, { name: 'Hombres', color: 'var(--g-h)' }],
    easy: `A igual nivel las diferencias son pequeñas; la brecha media (${fmtPct(HR.gap)}) se explica sobre todo porque hay menos mujeres en los puestos mejor pagados.`,
    table: { head: ['Nivel', 'Mujeres', 'Hombres', 'Brecha'], rows: salLevels.map((l, i) => [D.levels[l], fmtEur(salLevel[i].w, { full: true }), fmtEur(salLevel[i].h, { full: true }), fmtPct(1 - salLevel[i].w / salLevel[i].h)]), align: ['', 'r', 'r', 'r'] },
    draw: (c, w) => drawCols(c, w, { labels: salLevels.map((l) => D.levels[l].replace('Técnico/a y especialista', 'Técnico/a').replace('Personal operativo', 'Operativo').replace('Mando intermedio', 'Mando')), mode: 'group', h: 240, yFmt: (v) => dec(v / 1000, 0) + ' k', fmt: (v) => fmtEur(v, { full: true }), series: [{ name: 'Mujeres', color: 'var(--g-m)', values: salLevel.map((s) => s.w) }, { name: 'Hombres', color: 'var(--g-h)', values: salLevel.map((s) => s.h) }], tipExtra: (i) => [{ name: 'Brecha en el nivel', value: fmtPct(1 - salLevel[i].w / salLevel[i].h) }] }),
  }));
  put(body, 'form', chartCard({
    id: 'mis-training',
    title: 'Horas de formación por edad (2026)', sub: 'Media de horas por persona · línea: media de la empresa',
    easy: `Las personas de 55 años o más reciben ${dec(form[4], 0)} horas de formación, frente a ${dec(formAvg, 0)} de media. Hay riesgo de brecha digital.`,
    table: { head: ['Tramo', 'Horas medias'], rows: bands.map((b, i) => [b, dec(form[i], 1)]), align: ['', 'r'] },
    draw: (c, w) => drawCols(c, w, { labels: bands, h: 240, yFmt: (v) => dec(v, 0) + ' h', fmt: (v) => dec(v, 1) + ' h', highlight: 4, dimOthers: false, topLabels: 'all', colorAt: (i) => (i === 4 ? 'var(--s2)' : 'var(--s1)'), series: [{ name: 'Horas medias', color: 'var(--s1)', values: form }], refs: [{ v: formAvg, label: `Media ${dec(formAvg, 0)} h` }] }),
  }));
  const abs = hr.map((h) => h[2]);
  put(body, 'abs', chartCard({
    title: 'Absentismo mensual', sub: 'Horas de ausencia sobre horas pactadas',
    easy: `El absentismo sube en invierno (gripe) y baja en agosto. En septiembre de 2026 fue del ${fmtPct(abs[LAST])}.`,
    table: { head: ['Mes', 'Absentismo', 'Plantilla'], rows: hr.map((h) => [mLabel(h[0], 'long'), fmtPct(h[2]), h[1]]), align: ['', 'r', 'r'] },
    draw: (c, w) => drawLine(c, w, { labels: D.months.map((_, t) => mLabel(t)), h: 220, yFmt: (v) => fmtPct(v, 0), zero: false, yMin: 0.02, yMax: 0.06, series: [{ name: 'Absentismo', color: 'var(--s1)', values: abs, area: true, fmt: (v) => fmtPct(v) }], refs: [{ v: 0.045, label: 'Umbral de alerta 4,5 %' }], tipTitle: (i) => mLabel(i, 'long') }),
  }));
}

/* ---------------------------------------------------------------- informe de clientes e inclusión */
function misClientes(body) {
  $('#mis-scope').textContent = 'Clientes particulares y empresas · datos a 30/09/2026';
  const cu = D.customers;
  const npsAll = sum(cu.nps.map((n, i) => n * cu.compradores[i]));
  const asi = cu.asistidos, acc = cu.accesible;
  const asiLast = asi[asi.length - 1], accLast = acc[acc.length - 1];
  const aud = cu.auditoria_web, audLast = aud[aud.length - 1][1];
  const b2b = cu.clientes_b2b;
  body.innerHTML = `
    <div class="kpis">
      ${kpiHtml({ label: 'Valoración en Amazon', value: dec(cu.valoracion_amazon, 1), unit: ' / 5', foot: `${fmtN(cu.resenas_amazon)} reseñas` })}
      ${kpiHtml({ label: 'NPS de la tienda web', value: dec(npsAll, 0), foot: `personas de 65 años o más: ${cu.nps[5]}` })}
      ${kpiHtml({ label: 'Pedidos asistidos por teléfono', value: fmtN(asiLast[1]), foot: `septiembre · ${fmtPct(asiLast[2], 0)} de clientes de 65 años o más` })}
      ${kpiHtml({ label: 'Peticiones de formato accesible', value: fmtN(accLast[1]), delta: deltaHtml(accLast[1] / acc[0][1] - 1, { suffix: ' desde enero' }) })}
      ${kpiHtml({ label: 'Accesibilidad de la web', value: fmtN(audLast), unit: ' / 100', foot: statusChip(audLast >= 95 ? 'good' : 'warn', `objetivo ${cu.objetivo_web} (Ley 11/2023)`) })}
      ${kpiHtml({ label: 'Empresas clientes activas', value: fmtN(b2b[b2b.length - 1][1]), foot: `recurrencia anual ${fmtPct(cu.recurrencia_b2b, 0)}` })}
    </div>
    <div class="grid g2"><div data-slot="age"></div><div data-slot="nps"></div></div>
    <div class="grid g2"><div data-slot="inc"></div><div data-slot="aud"></div></div>
    <div class="callout">${icon('info')}<div><h4>Qué nos dice este informe</h4><p>Las personas mayores de 65 años son el 26 % de la población adulta, pero solo el 8 % de nuestros compradores web, y son las menos satisfechas. Los pedidos asistidos por teléfono y las peticiones de formato accesible crecen cada mes. Todo apunta a una demanda que la web no está cubriendo; el DSS evalúa cómo atenderla.</p></div></div>`;
  put(body, 'age', chartCard({
    id: 'mis-age',
    title: 'Compradores web y población por edad', sub: 'Porcentaje de cada tramo · solo el 38 % de compradores declara su edad',
    legend: [{ name: 'Población adulta (INE, aprox.)', color: 'var(--neutral-mark)' }, { name: 'Compradores de kaidora.es', color: 'var(--s1)' }],
    easy: 'Las personas mayores de 65 años compran mucho menos online de lo que les correspondería por población. Es una brecha digital.',
    table: { head: ['Edad', 'Población', 'Compradores'], rows: cu.bandas.map((b, i) => [b, fmtPct(cu.poblacion[i]), fmtPct(cu.compradores[i])]), align: ['', 'r', 'r'] },
    draw: (c, w) => drawCols(c, w, { labels: cu.bandas, mode: 'group', h: 240, yFmt: (v) => fmtPct(v, 0), series: [{ name: 'Población adulta', color: 'var(--neutral-mark)', values: cu.poblacion }, { name: 'Compradores web', color: 'var(--s1)', values: cu.compradores }] }),
  }));
  put(body, 'nps', chartCard({
    title: 'Satisfacción (NPS) por edad', sub: 'Net Promoter Score de la tienda web, de −100 a +100',
    easy: `Los clientes de 65 años o más nos recomiendan mucho menos (NPS ${cu.nps[5]}) que los de 35 a 44 (NPS ${cu.nps[2]}). La web les resulta más difícil.`,
    table: { head: ['Edad', 'NPS'], rows: cu.bandas.map((b, i) => [b, cu.nps[i]]), align: ['', 'r'] },
    draw: (c, w) => drawCols(c, w, { labels: cu.bandas, h: 240, yFmt: (v) => dec(v, 0), highlight: 5, dimOthers: false, topLabels: 'all', colorAt: (i) => (i === 5 ? 'var(--s2)' : 'var(--s1)'), series: [{ name: 'NPS', color: 'var(--s1)', values: cu.nps }] }),
  }));
  const asiS = D.months.map((_, t) => { const r = asi.find((x) => x[0] === t); return r ? r[1] : null; });
  const accS = D.months.map((_, t) => { const r = acc.find((x) => x[0] === t); return r ? r[1] : null; });
  const from = D.months.indexOf('2025-04');
  put(body, 'inc', chartCard({
    id: 'mis-inclusive',
    title: 'Atención inclusiva cada mes', sub: 'Pedidos asistidos por teléfono (piloto desde junio de 2025) y peticiones de formato accesible (desde enero de 2026)',
    legend: [{ name: 'Pedidos asistidos', color: 'var(--s1)', key: 'line' }, { name: 'Formato accesible', color: 'var(--s2)', key: 'line' }],
    easy: `Los dos servicios crecen mes a mes: en septiembre hubo ${asiLast[1]} pedidos asistidos y ${accLast[1]} peticiones de formato accesible.`,
    table: { head: ['Mes', 'Asistidos', 'Formato accesible'], rows: range(from, LAST).map((t) => [mLabel(t, 'long'), asiS[t] ?? '—', accS[t] ?? '—']), align: ['', 'r', 'r'] },
    draw: (c, w) => drawLine(c, w, { labels: range(from, LAST).map((t) => mLabel(t)), h: 240, yFmt: fmtN, series: [{ name: 'Pedidos asistidos', color: 'var(--s1)', values: range(from, LAST).map((t) => asiS[t]) }, { name: 'Formato accesible', color: 'var(--s2)', values: range(from, LAST).map((t) => accS[t]) }], tipTitle: (i) => mLabel(from + i, 'long') }),
  }));
  put(body, 'aud', chartCard({
    title: 'Auditoría de accesibilidad de kaidora.es', sub: 'Puntuación WCAG 2.2 (0–100) en cada auditoría semestral',
    easy: `La web ha mejorado de ${aud[0][1]} a ${audLast} puntos, pero aún no llega al ${cu.objetivo_web} que nos marcamos para cumplir la Ley 11/2023 de accesibilidad.`,
    table: { head: ['Auditoría', 'Puntuación'], rows: aud.map((a) => [a[0], a[1]]), align: ['', 'r'] },
    draw: (c, w) => drawCols(c, w, { labels: aud.map((a) => a[0].split('-').reverse().join(' ')), h: 240, yFmt: (v) => dec(v, 0), topLabels: 'all', series: [{ name: 'Puntuación', color: 'var(--s1)', values: aud.map((a) => a[1]) }], refs: [{ v: cu.objetivo_web, label: `Objetivo ${cu.objetivo_web}` }] }),
  }));
}
