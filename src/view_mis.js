/* ===================================================================== view_mis.js
   MIS · informes de gestión: facturación frente a presupuesto, puente por canal,
   desgloses y mapa por comunidad. */

FICHAS.mis = {
  pregunta: '¿Cómo vamos frente al plan?',
  datos: 'Resúmenes del TPS: facturación, márgenes, devoluciones y producción, frente a presupuesto y año anterior',
  nivel: 'Gerencial (táctico) · decisiones semiestructuradas y recurrentes',
  usuarios: 'Jefes de ventas, marketplaces, producción, logística y compras',
  frecuencia: 'Semanal y cierre mensual',
  formato: 'Informes periódicos, comparativas frente a presupuesto y desgloses por canal, línea y comunidad',
  ejemplos: 'Informes de negocio de Amazon Seller Central · informes de Odoo Ventas e Inventario · informe OTIF de proveedores',
};
const regionItems = (a, p) => D.regions.map((r, i) => ({ id: r.id, idx: i, name: r.nombre, value: a.byRe[i].rev, extra: p && p.byRe[i].rev ? [{ name: 'vs año anterior', value: signPct(a.byRe[i].rev / p.byRe[i].rev - 1) }] : [] }));
const eurShort = (v) => (Math.abs(v) >= 1e6 ? dec(v / 1e6, 1) + 'M' : dec(v / 1e3, 0) + 'k');

RENDER.mis = function () {
  const per = periodObj(), ms = per.months, pm = prevMonths(ms);
  const a = agg(ms), p = pm ? agg(pm) : null, b = budgetFor(ms);
  const margin = a.rev ? a.contrib / a.rev : 0, pMargin = p && p.rev ? p.contrib / p.rev : null;
  const ret = a.units ? a.ret / a.units : 0, pRet = p && p.units ? p.ret / p.units : null;
  const oee = oeeAvg(ms), otif = mean(D.ops.filter((o) => ms.includes(o[0])).map((o) => o[4]));
  const l12 = range(LAST - 11, LAST), m12 = l12.map((t) => agg([t]));
  const el = mount('view-mis', `<div class="report">
    ${reportHead('mis', 'Información gerencial', slicersHtml(['period', 'ch', 'li', 're']))}
    <div class="kpis">
      ${kpiHtml({ l: 'Facturación', v: fmtEur(a.rev), d: b ? deltaHtml(a.rev / b - 1, { suffix: 'vs presupuesto' }) : (p ? deltaHtml(a.rev / p.rev - 1, { suffix: 'vs año anterior' }) : ''), spark: m12.map((x) => x.rev) })}
      ${kpiHtml({ l: 'Margen de contribución', v: fmtPct(margin), d: pMargin != null ? deltaHtml(margin - pMargin, { pp: true }) : '', spark: m12.map((x) => x.contrib / x.rev) })}
      ${kpiHtml({ l: 'Tasa de devolución', v: fmtPct(ret, 2), d: pRet != null ? deltaHtml(ret - pRet, { pp: true, goodUp: false, d: 2 }) : '', spark: m12.map((x) => x.ret / x.units), color: 'var(--s2)' })}
      ${kpiHtml({ l: 'OEE de montaje', v: fmtPct(oee), d: statusChip(oee >= 0.85 ? 'good' : oee >= 0.75 ? 'warn' : 'crit', 'obj. 85 %'), spark: l12.map((t) => oeeAvg([t])) })}
      ${kpiHtml({ l: 'Entregas a tiempo (OTIF)', v: fmtPct(otif), d: statusChip(otif >= 0.95 ? 'good' : 'warn', 'obj. 95 %'), spark: l12.map((t) => D.ops[t][4]) })}
    </div>
    <div class="visuals v-mis">
      <div data-slot="trend" class="span-2"></div>
      <div data-slot="bridge"></div>
      <div data-slot="li"></div>
      <div data-slot="map"></div>
    </div></div>`);
  bindSlicers(el, ['period', 'ch', 'li', 're']);

  // tendencia mensual: real, presupuesto y año anterior
  const allM = range(0, LAST), all = agg(allM);
  const real = allM.map((t) => all.byM.get(t).rev), bud = budgetByM(allM);
  const ly = allM.map((t) => (t >= 12 ? real[t - 12] : null));
  const trendSeries = [{ name: 'Real', color: 'var(--s1)', values: real, area: true, fmt: (v) => fmtEur(v) }]
    .concat(bud ? [{ name: 'Presupuesto', color: 'var(--ink-2)', values: bud, dash: true, noLabel: true, fmt: (v) => fmtEur(v) }] : [])
    .concat([{ name: 'Año anterior', color: 'var(--neutral-mark)', values: ly, noLabel: true, fmt: (v) => fmtEur(v) }]);
  put(el, 'trend', tile({
    title: 'Facturación mensual', cls: 'span-2', aside: per.label, hidden: ['Año anterior'],
    legend: trendSeries.map((s) => ({ name: s.name, color: s.color, key: 'line', dash: s.dash, toggle: s.name !== 'Real' })),
    alt: 'Facturación mensual de enero de 2022 a septiembre de 2026',
    listen: () => {
      const vals = ms.map((t) => real[t]);
      return { values: vals, summary: `Periodo ${per.label}. ${sumSeries(ms.map((t) => mLabel(t, 'long')), vals, (v) => fmtEur(v))}${b ? ` En total, ${fmtEur(a.rev)} frente a un presupuesto de ${fmtEur(b)}: ${signPct(a.rev / b - 1)}.` : ''}` };
    },
    table: () => ({ head: ['Mes', 'Real', 'Presupuesto', 'Desviación', 'Año anterior'], rows: allM.map((t) => [mLabel(t, 'long'), fmtEur(real[t], { full: true }), bud ? fmtEur(bud[t], { full: true }) : '—', bud ? signPct(real[t] / bud[t] - 1) : '—', ly[t] != null ? fmtEur(ly[t], { full: true }) : '—']), align: ['', 'r', 'r', 'r', 'r'] }),
    draw: (c, w, h, hid) => drawLine(c, w, h, {
      labels: allM.map((t) => mLabel(t)), yFmt: eurAxis, hidden: hid, series: trendSeries,
      bands: [{ from: ms[0], to: ms[ms.length - 1] }], tipTitle: (i) => mLabel(i, 'long'),
      tipExtra: (i) => (bud ? [{ name: 'Desviación', value: signPct(real[i] / bud[i] - 1) }] : []),
      onClick: (i) => drillMonth(i), hitLabel: 'Facturación mensual: flechas para recorrer, Intro para ver los pedidos del mes',
    }),
  }));

  // puente presupuesto (o año anterior) -> real, por canal
  const baseByCh = b ? D.channels.map((_, i) => sum(ms, (t) => BUDGET[t][i])) : p ? D.channels.map((_, i) => p.byCh[i].rev) : null;
  const baseName = b ? 'Presupuesto' : 'Año anterior';
  if (baseByCh) {
    const shown = D.channels.map((c, i) => i).filter((i) => S.f.ch < 0 || S.f.ch === i);
    const steps = [{ label: baseName, value: sum(shown, (i) => baseByCh[i]), total: true }]
      .concat(shown.map((i) => ({ label: D.channels[i].corto, value: a.byCh[i].rev - baseByCh[i], idx: i, extra: [{ name: baseName, value: fmtEur(baseByCh[i]) }, { name: 'Real', value: fmtEur(a.byCh[i].rev) }, { name: 'Variación', value: signPct(a.byCh[i].rev / baseByCh[i] - 1) }] })))
      .concat([{ label: 'Real', value: sum(shown, (i) => a.byCh[i].rev), total: true }]);
    put(el, 'bridge', tile({
      title: `${baseName} → real por canal`, aside: signPct(steps[steps.length - 1].value / steps[0].value - 1),
      listen: () => ({ values: steps.filter((x) => !x.total).map((x) => x.value), summary: `${baseName}: ${fmtEur(steps[0].value)}; real: ${fmtEur(steps[steps.length - 1].value)}. Diferencia por canal: ${steps.filter((x) => !x.total).map((x) => `${x.label}, ${x.value >= 0 ? 'más' : 'menos'} ${fmtEur(Math.abs(x.value))}`).join('; ')}.` }),
      table: () => ({ head: ['Paso', 'Importe'], rows: steps.map((s) => [s.label, (s.total ? '' : s.value >= 0 ? '+' : '') + fmtEur(s.value, { full: true })]), align: ['', 'r'] }),
      draw: (c, w, h) => drawWaterfall(c, w, h, { steps, yFmt: eurAxis, fmt: (v) => (Math.abs(v) < 1e4 ? dec(v / 1e3, 1) + ' k€' : fmtEur(v)), fmtTotal: (v) => fmtEur(v), sel: S.f.ch, onClick: (s) => setFilter('ch', s.idx) }),   // desviaciones siempre en k€
    }));
  } else {
    put(el, 'bridge', tile({ title: 'Facturación por canal', listen: () => { const r = D.channels.map((ch, i) => ({ label: ch.corto, value: a.byCh[i].rev })); return { values: r.map((x) => x.value).sort((x, y) => y - x), summary: sumRank(r, (v) => fmtEur(v)) }; }, draw: (c, w, h) => drawHBars(c, w, h, { rows: D.channels.map((ch, i) => ({ label: ch.corto, value: a.byCh[i].rev, color: CH_COLORS[i], idx: i })), fmt: (v) => fmtEur(v), onClick: (r) => setFilter('ch', r.idx) }) }));
  }

  const liRows = D.lines.map((l, i) => ({ label: l.nombre, value: a.byLi[i].rev, color: 'var(--s1)', idx: i, dim: S.f.li >= 0 && S.f.li !== i, tip: [{ name: 'Facturación', value: fmtEur(a.byLi[i].rev), color: 'var(--s1)', key: 'rect' }].concat(p && p.byLi[i].rev ? [{ name: 'vs año anterior', value: signPct(a.byLi[i].rev / p.byLi[i].rev - 1) }] : []) })).sort((x, y) => y.value - x.value);
  put(el, 'li', tile({
    title: 'Facturación por línea de kit',
    listen: () => ({ values: liRows.map((r) => r.value), summary: sumRank(liRows, (v) => fmtEur(v)) }),
    table: () => ({ head: ['Línea', 'Facturación'], rows: liRows.map((r) => [r.label, fmtEur(r.value, { full: true })]), align: ['', 'r'] }),
    draw: (c, w, h) => drawHBars(c, w, h, { rows: liRows, fmt: (v) => fmtEur(v), onClick: (r) => setFilter('li', r.idx) }),
  }));
  const items = regionItems(a, p);
  put(el, 'map', tile({
    title: 'Facturación por comunidad',
    listen: () => { const r = items.map((x) => ({ label: x.name, value: x.value })); return { values: r.map((x) => x.value).sort((x, y) => y - x), summary: `${sumRank(r, (v) => fmtEur(v))} Las notas van de la comunidad que más factura a la que menos.` }; },
    table: () => ({ head: ['Comunidad', 'Facturación'], rows: items.slice().sort((x, y) => y.value - x.value).map((r) => [r.name, fmtEur(r.value, { full: true })]), align: ['', 'r'] }),
    draw: (c, w, h) => drawSpainMap(c, w, h, { key: 'mis', items, fmt: (v) => fmtEur(v), fmtShort: eurShort, sel: S.f.re, onClick: (it) => setFilter('re', it.idx) }),
  }));
};

/* ---------------------------------------------------------------- obtener detalles: mes -> pedidos */
function drillMonth(t) {
  const flt = S.f, a = agg([t], flt);
  const r = rng(9000 + t * 31 + (flt.ch + 2) * 7 + (flt.li + 2) * 13 + (flt.re + 2) * 17);
  const rows = FACTS_BY_M[t].filter((f) => matches(f, flt));
  const w = rows.map((f) => f[4] / D.channels[f[1]].upo);
  const y = mYear(t), m = mMonth(t), dim = new Date(y, m, 0).getDate();
  const sample = [];
  for (let i = 0; i < 30 && rows.length; i++) {
    const f = rows[pickW(r, w)], c = f[1];
    const units = c < 2 ? (r() < 0.78 ? 1 : 2) : Math.max(2, Math.round(D.channels[c].upo * lnorm(r, 0.4)));
    const mins = Math.floor(r() * 1440);
    sample.push({ date: new Date(y, m - 1, 1 + Math.floor(r() * dim), Math.floor(mins / 60), mins % 60), id: 'S0' + (20000 + Math.floor(r() * 28000)), c, li: f[2], re: f[3], units, amount: (units * f[5]) / f[4] });
  }
  sample.sort((p, q) => q.date - p.date);
  const body = frag(`<div style="display:grid;gap:12px">
    <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      ${kpiHtml({ l: 'Facturación', v: fmtEur(a.rev) })}${kpiHtml({ l: 'Pedidos', v: fmtN(a.orders) })}${kpiHtml({ l: 'Kits', v: fmtN(a.units) })}${kpiHtml({ l: 'Ticket medio', v: fmtEur(a.rev / Math.max(1, a.orders), { cents: true }) })}
    </div>
    <div class="tbl"><table class="t"><thead><tr><th>Fecha</th><th>Pedido</th><th>Canal</th><th>Kit</th><th>Comunidad</th><th class="r">Uds.</th><th class="r">Importe</th></tr></thead>
    <tbody>${sample.map((s) => `<tr><td class="num">${s.date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} ${String(s.date.getHours()).padStart(2, '0')}:${String(s.date.getMinutes()).padStart(2, '0')}</td><td class="num muted">${s.id}</td><td><i class="swatch" style="background:${CH_COLORS[s.c]}"></i>${esc(D.channels[s.c].corto)}</td><td>${esc(D.lines[s.li].nombre)}</td><td>${esc(D.regions[s.re].nombre)}</td><td class="r">${fmtN(s.units)}</td><td class="r">${dec(s.amount, 2)} €</td></tr>`).join('')}</tbody></table></div>
  </div>`);
  Drawer.open({ title: `Detalle · ${mLabel(t, 'long')}`, path: `<span class="chip-l" data-l="mis"><b>MIS</b>${esc(mLabel(t, 'long'))}</span><span>›</span><span class="chip-l" data-l="tps"><b>TPS</b>pedidos</span>`, body });
}
