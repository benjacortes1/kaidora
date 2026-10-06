/* ===================================================================== view_ess.js
   ESS · cuadro de mando de la dirección: objetivo, tendencia, cuadro de mando integral,
   mix de canales, territorio e indicadores ODS (enfoque inclusivo). */

FICHAS.ess = {
  pregunta: '¿Hacia dónde vamos?',
  datos: 'KPIs muy agregados del MIS y del DSS, tendencias de varios años y datos externos (mercado, regulación, INE)',
  nivel: 'Estratégico · decisiones no estructuradas y de largo plazo',
  usuarios: 'CEO y comité de dirección (CFO, COO, CCO, CPO)',
  frecuencia: 'Mensual y trimestral, con consulta en cualquier momento',
  formato: 'Cuadro de mando integral con semáforos, tendencias y acceso al detalle',
  ejemplos: 'Cuadro de mando integral de Kaplan y Norton · tableros de Odoo · indicadores del plan de igualdad (RD 901/2020)',
};
const lvlUp = (v, g, w) => (v >= g ? 'good' : v >= w ? 'warn' : 'crit');
const lvlDown = (v, g, w) => (v <= g ? 'good' : v <= w ? 'warn' : 'crit');

RENDER.ess = function () {
  const per = periodObj(), ms = per.months, pm = prevMonths(ms);
  const a = agg(ms, ALL), p = pm ? agg(pm, ALL) : null, b = budgetFor(ms, ALL);
  const ebitda = (a.contrib - sum(ms, (t) => FIXED_COST[mYear(t)])) / a.rev;
  const y26 = range(T('2026-01'), LAST), y25a = range(T('2025-01'), T('2025-09')), q4 = range(T('2025-10'), T('2025-12'));
  const ytd = agg(y26, ALL).rev, ytdPrev = agg(y25a, ALL).rev, forecast = ytd + agg(q4, ALL).rev * (ytd / ytdPrev);
  const amz = a.byCh[1].rev / a.rev, growth = p ? a.rev / p.rev - 1 : null;
  const opsR = D.ops.filter((o) => ms.includes(o[0]));
  const otif = mean(opsR.map((o) => o[4]));
  const hrR = D.hr.filter((h) => ms.includes(h[0])), abs = mean(hrR.map((h) => h[2]));
  const cu = D.customers, npsAll = sum(cu.nps.map((n, i) => n * cu.compradores[i])), b2bL = cu.clientes_b2b, b2b = b2bL[b2bL.length - 1][1];
  const aud = cu.auditoria_web[cu.auditoria_web.length - 1][1];
  const l12 = range(LAST - 11, LAST), m12 = l12.map((t) => agg([t], ALL));
  const toMis = (filter) => ({ view: 'mis', filter: Object.assign({ period: S.f.period, ch: -1, li: -1, re: -1 }, filter) });

  const el = mount('view-ess', `<div class="report">
    ${reportHead('ess', 'Información para la dirección', slicersHtml(['period']))}
    <div class="kpis">
      ${kpiHtml({ l: `Facturación · ${per.label}`, v: fmtEur(a.rev), d: growth != null ? deltaHtml(growth, { suffix: 'vs año anterior' }) : '', go: toMis({}), spark: m12.map((x) => x.rev) })}
      ${kpiHtml({ l: 'Previsión de cierre 2026', v: fmtEur(forecast), d: deltaHtml(forecast / TARGET_2026 - 1, { suffix: 'vs objetivo' }) })}
      ${kpiHtml({ l: 'Margen EBITDA', v: fmtPct(ebitda), d: statusChip(lvlUp(ebitda, 0.12, 0.09), 'obj. 12 %'), spark: m12.map((x, i) => (x.contrib - FIXED_COST[mYear(l12[i])]) / x.rev) })}
      ${kpiHtml({ l: 'Peso de Amazon', v: fmtPct(amz), d: statusChip(lvlDown(amz, 0.35, 0.42), 'máx. 35 %'), go: toMis({ ch: 1 }), spark: m12.map((x) => x.byCh[1].rev / x.rev), color: 'var(--s2)' })}
      ${kpiHtml({ l: 'Empresas clientes', v: fmtN(b2b), d: deltaHtml(b2b / b2bL[b2bL.length - 2][1] - 1, { suffix: 'vs 2025' }), go: toMis({ ch: 2 }), spark: b2bL.map((x) => x[1]) })}
      ${kpiHtml({ l: 'Plantilla', v: fmtN(HR.total), d: deltaHtml(D.hr[LAST][1] / D.hr[LAST - 12][1] - 1, { suffix: 'en 12 meses' }), spark: D.hr.slice(-12).map((h) => h[1]) })}
    </div>
    <div class="visuals v-ess">
      <div data-slot="gauge"></div>
      <div data-slot="traj"></div>
      <div data-slot="bsc"></div>
      <div data-slot="mix"></div>
      <div data-slot="ods"></div>
    </div></div>`);
  bindSlicers(el, ['period']);

  put(el, 'gauge', tile({
    title: 'Objetivo de facturación 2026', aside: fmtEur(TARGET_2026),
    alt: `${fmtPct(ytd / TARGET_2026, 0)} del objetivo conseguido a septiembre; previsión de cierre ${fmtPct(forecast / TARGET_2026, 0)}`,
    listen: () => ({ summary: `A 30 de septiembre llevamos ${fmtEur(ytd)}, el ${fmtPct(ytd / TARGET_2026, 0)} del objetivo anual de ${fmtEur(TARGET_2026)}. La previsión de cierre es de ${fmtEur(forecast)}, el ${fmtPct(forecast / TARGET_2026, 0)} del objetivo.` }),
    draw: (c, w, h) => drawGauge(c, w, h, { value: ytd, max: TARGET_2026 * 1.2, label: fmtPct(ytd / TARGET_2026, 0), sub: `${fmtEur(ytd)} a 30/09`, maxLabel: '120 %', color: 'var(--brand)', proj: forecast, sub2: `Previsión de cierre: ${fmtPct(forecast / TARGET_2026, 0)}`, marks: [{ v: TARGET_2026, label: 'Objetivo' }] }),
  }));

  const all = agg(range(0, LAST), ALL), yrs = [2022, 2023, 2024, 2025, 2026];
  const cum = (yr) => { let s = 0; return range(0, 11).map((m) => { const t = (yr - 2022) * 12 + m; if (t > LAST) return null; s += all.byM.get(t).rev; return s; }); };
  const seas = range(T('2025-01'), T('2025-12')).map((t) => all.byM.get(t).rev), seasT = sum(seas);
  let acc = 0; const tgt = seas.map((v) => (acc += (v / seasT) * TARGET_2026));
  const yColor = { 2022: 'var(--yr1)', 2023: 'var(--yr2)', 2024: 'var(--yr3)', 2025: 'var(--yr4)', 2026: 'var(--s1)' };
  const trajSeries = yrs.map((y) => ({ name: String(y), color: yColor[y], values: cum(y), noLabel: y !== 2026, width: y === 2026 ? 3 : 1.75, fmt: (v) => fmtEur(v) })).concat([{ name: 'Objetivo', color: 'var(--ink-2)', values: tgt, dash: true, noLabel: true, fmt: (v) => fmtEur(v) }]);
  put(el, 'traj', tile({
    title: 'Facturación acumulada por año',
    listen: () => {
      const c26 = cum(2026).filter((v) => v != null), m = c26.length - 1, c25 = cum(2025)[m];
      return { values: c26, summary: `En 2026 la facturación acumulada llega a ${fmtEur(c26[m])} a final de ${MES_L[m]}, frente a ${fmtEur(c25)} en la misma fecha de 2025: ${signPct(c26[m] / c25 - 1)}. El objetivo a esa fecha era de ${fmtEur(tgt[m])}.` };
    },
    legend: trajSeries.slice().reverse().map((s) => ({ name: s.name, color: s.color, key: 'line', dash: s.dash, toggle: s.name !== '2026' })),
    table: () => ({ head: ['Mes'].concat(trajSeries.map((s) => s.name)), rows: range(0, 11).map((m) => [MES_L[m]].concat(trajSeries.map((s) => (s.values[m] != null ? fmtEur(s.values[m]) : '—')))), align: ['', ...trajSeries.map(() => 'r')] }),
    draw: (c, w, h, hid) => drawLine(c, w, h, { labels: MES, yFmt: eurAxis, hidden: hid, series: trajSeries, tipTitle: (i) => `Acumulado a ${MES_L[i]}`, xEvery: w < 380 ? 3 : 2 }),
  }));

  const bsc = [
    ['Financiera', 'Crecimiento', growth != null ? signPct(growth) : '—', '+15 %', growth != null ? lvlUp(growth, 0.15, 0.08) : 'info', {}],
    ['Financiera', 'vs presupuesto', b ? signPct(a.rev / b - 1) : '—', '±3 %', b ? (a.rev / b - 1 >= -0.03 ? 'good' : 'warn') : 'info', {}],
    ['Clientes', 'Valoración Amazon', dec(cu.valoracion_amazon, 1), '4,5', lvlUp(cu.valoracion_amazon, 4.5, 4.2), { ch: 1 }],
    ['Clientes', 'NPS tienda web', dec(npsAll, 0), '55', lvlUp(npsAll, 55, 45), { ch: 0 }],
    ['Procesos', 'OTIF', fmtPct(otif), '95 %', lvlUp(otif, 0.95, 0.92), {}],
    ['Personas', 'Absentismo', fmtPct(abs), '≤ 4,5 %', lvlDown(abs, 0.045, 0.055), null],
  ];
  const bscTile = put(el, 'bsc', tile({
    title: 'Cuadro de mando integral',
    listen: () => { const bad = bsc.filter((r) => r[4] === 'warn' || r[4] === 'crit'); return { summary: `${bsc.filter((r) => r[4] === 'good').length} de ${bsc.length} indicadores en verde. ${bad.length ? `Para vigilar: ${bad.map((r) => `${r[1]}, ${r[2]} frente a un objetivo de ${r[3]}`).join('; ')}.` : ''}` }; },
    aside: `<span class="count-badge good">${bsc.filter((r) => r[4] === 'good').length}/${bsc.length} OK</span>`,
    body: `<div class="tbl"><table class="t dense"><thead><tr><th>Perspectiva</th><th>Indicador</th><th class="r">Valor</th><th class="r">Obj.</th><th></th></tr></thead><tbody>${bsc.map((r, i) => `<tr${r[5] ? ` class="click" tabindex="0" data-bsc="${i}"` : ''}><td class="muted">${r[0]}</td><td>${r[1]}</td><td class="r"><b>${r[2]}</b></td><td class="r muted">${r[3]}</td><td>${statusChip(r[4], { good: 'OK', warn: 'Vigilar', crit: 'Alerta', info: '—' }[r[4]])}</td></tr>`).join('')}</tbody></table></div>`,
  }));
  $$('tr[data-bsc]', bscTile).forEach((tr) => {
    const act = () => go('mis', { filter: Object.assign({ period: S.f.period, ch: -1, li: -1, re: -1 }, bsc[+tr.dataset.bsc][5]) });
    tr.addEventListener('click', act); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') act(); });
  });

  const mixRows = yrs.map((y) => { const x = agg(range((y - 2022) * 12, Math.min(LAST, (y - 2022) * 12 + 11)), ALL); return { label: y === 2026 ? '2026*' : String(y), parts: x.byCh.map((c) => c.rev) }; });
  put(el, 'mix', tile({
    title: 'Mix de canales por año', aside: '*ene–sep',
    listen: () => {
      const sh = (r, i) => r.parts[i] / sum(r.parts), f = mixRows[0], l = mixRows[mixRows.length - 1];
      return { values: mixRows.map((r) => sh(r, 1)), summary: `El peso de Amazon pasa del ${fmtPct(sh(f, 1), 0)} en 2022 al ${fmtPct(sh(l, 1), 0)} en 2026, y el de las empresas B2B, del ${fmtPct(sh(f, 2), 0)} al ${fmtPct(sh(l, 2), 0)}. Las notas siguen el peso de Amazon año a año.` };
    },
    legend: D.channels.map((c, i) => ({ name: c.corto, color: CH_COLORS[i] })),
    table: () => ({ head: ['Año'].concat(D.channels.map((c) => c.corto)), rows: mixRows.map((r) => [r.label].concat(r.parts.map((v) => fmtPct(v / sum(r.parts))))), align: ['', 'r', 'r', 'r', 'r', 'r'] }),
    draw: (c, w, h) => drawStack100(c, w, h, { rows: mixRows, series: D.channels.map((ch, i) => ({ name: ch.corto, color: CH_COLORS[i], ink: i === 2 || i === 3 ? '#1b1a19' : '#fff' })), fmtVal: (v) => fmtEur(v) }),
  }));


  const leaders = HR.leadersW / HR.leaders.length, disc = HR.disc / HR.total;
  // etiquetas braille: días de cobertura del stock (mismo dato que el inventario del TPS)
  const br = D.components.find((c) => c.id === 'C18'), brDays = br ? (br.stock - br.consumo) / br.consumo : 0;
  const ods = [
    [5, 'Mujeres en puestos de mando', leaders, 0.45, (v) => fmtPct(v, 0), false],
    [5, 'Brecha salarial media', HR.gap, 0.05, (v) => fmtPct(v, 1), true],
    [10, 'Plantilla con discapacidad', disc, 0.03, (v) => fmtPct(v, 1), false],
    [10, 'Formación +55 vs media', HR.form55, 1, (v) => fmtPct(v, 0), false],
    [10, 'Accesibilidad web (WCAG)', aud / 100, cu.objetivo_web / 100, (v) => dec(v * 100, 0) + '/100', false],
    [10, 'Compradores web de 65+', cu.compradores[5], 0.12, (v) => fmtPct(v, 0), false],
    [10, 'Stock de etiquetas braille', brDays, 15, (v) => `${dec(v, 0)} días`, false],
  ];
  put(el, 'ods', tile({
    title: 'Indicadores ODS 5 · 10', aside: 'obj. 2027',
    listen: () => ({ summary: ods.map(([n, l, v, t, f, inv]) => `${l}: ${f(v)}, objetivo ${inv ? 'como máximo ' : ''}${f(t)}`).join('. ') + '.' }),
    body: `<div class="ods">${ods.map(([n, l, v, t, f, inv]) => {
      const prog = inv ? clamp(t / Math.max(v, 1e-9), 0, 1) : clamp(v / t, 0, 1);
      const cls = prog >= 0.98 ? '' : prog >= 0.8 ? 'warn' : 'crit';
      return `<div class="ods-row"><div class="ods-top"><span><i class="ods-n ods-${n}">${n}</i>${l}</span><b>${f(v)} <span class="muted" style="font-weight:400">/ ${inv ? '≤ ' : ''}${f(t)}</span></b></div>${meterHtml(prog, { cls, label: `${l}: ${f(v)}, objetivo ${f(t)}` })}</div>`;
    }).join('')}</div>`,
  }));
};
