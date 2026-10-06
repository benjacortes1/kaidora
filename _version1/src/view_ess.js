/* ===================================================================== view_ess.js
   ESS: cuadro de mando integral para el comité de dirección. */

const FICHA_ESS = {
  datos: ['KPIs <strong>muy agregados</strong> procedentes del MIS y del DSS', '<strong>Datos externos</strong>: mercado, regulación, competencia, INE', 'Tendencias de varios años y objetivos del plan estratégico', 'Indicadores ODS 5, 9 y 10 (igualdad, innovación, inclusión)'],
  nivel: 'Estratégico',
  nivelTxt: 'Decisiones no estructuradas y de largo plazo: diversificar canales, abrir un país, automatizar o invertir en inclusión.',
  usuarios: ['CEO y comité de dirección (CFO, COO, CCO, CPO)', 'Consejo de administración y socios', 'Clientes B2B que piden indicadores de sostenibilidad'],
  frecuencia: 'Mensual y trimestral, con consulta en cualquier momento',
  formato: 'Cuadro de mando en una sola pantalla: pocos indicadores, semáforos, tendencias, alertas y acceso al detalle (drill-down).',
  ejemplos: ['Cuadro de mando integral (Kaplan y Norton) en Power BI o en los tableros de Odoo', 'Seguimiento de posición y valoración en Amazon frente a otras marcas de botiquines', 'Indicadores del plan de igualdad y de la cuota de discapacidad para el consejo', 'Cuestionarios de sostenibilidad de grandes clientes B2B en sus homologaciones de proveedores'],
  porque: 'La dirección necesita ver en minutos si Kaidora va hacia donde quiere ir. El ESS lo resume en pocos indicadores frente a objetivos y avisa de riesgos y oportunidades.',
};

function monthlyMetric(ms, fn) { return ms.map((t) => fn(t)); }
function essTile({ label, value, unit = '', target, lvl, spark, drill, note }) {
  return kpiHtml({ label, value, unit, delta: statusChip(lvl, target), foot: note || '', spark: spark ? sparkSvg(spark, { color: 'var(--brand)' }) : '', drill });
}
const lvlUp = (v, good, warn) => (v >= good ? 'good' : v >= warn ? 'warn' : 'crit');
const lvlDown = (v, good, warn) => (v <= good ? 'good' : v <= warn ? 'warn' : 'crit');

RENDER.ess = function () {
  const per = periodObj(), ms = per.months, pm = prevMonths(ms);
  const a = agg(ms), p = pm ? agg(pm) : null, b = budgetFor(ms);
  const noFlt = S.f.ch < 0 && S.f.li < 0 && S.f.co < 0;
  const fixed = sum(ms, (t) => FIXED_COST[mYear(t)]);
  const ebitda = noFlt ? (a.contrib - fixed) / a.rev : null;
  const last12 = range(LAST - 11, LAST);
  const all = { ch: -1, li: -1, co: -1 };
  const allAgg = agg(range(0, LAST), all);
  const ytd26 = agg(range(24, LAST), all).rev, ytd25 = agg(range(12, 20), all).rev, q4_25 = agg(range(21, 23), all).rev;
  const forecast = ytd26 + q4_25 * (ytd26 / ytd25);
  const amzShare = a.rev ? a.byCh[1].rev / a.rev : 0;
  const intl = a.rev ? 1 - a.byCo[0].rev / a.rev : 0;
  const oee = oeeAvg(ms), opsR = D.ops.filter((o) => ms.includes(o[0]));
  const otif = mean(opsR.map((o) => o[4])), edi = opsR.length ? opsR[opsR.length - 1][2] : 0, rec = opsR.length ? opsR[opsR.length - 1][1] : 0;
  const cu = D.customers, npsAll = sum(cu.nps.map((n, i) => n * cu.compradores[i]));
  const audLast = cu.auditoria_web[cu.auditoria_web.length - 1][1];
  const leadersPct = HR.leadersW / HR.leaders.length, discPct = HR.disc / HR.total;
  const b2b = cu.clientes_b2b;
  const form55 = mean(EMP.filter((e) => e.edad >= 55).map((e) => e.formacion)) / mean(EMP.map((e) => e.formacion));
  const kit = kitModel(KIT_BASE), cap = capModel(CAP_BASE);
  const renew = D.oee.filter((o) => o[0] === LAST).map((o) => o[7]);
  const ptFem = EMP.filter((e) => e.jornada === 'Parcial');
  const ptW = ptFem.filter((e) => e.genero === 'M').length / ptFem.length;
  const ceeSpend = sum(D.suppliers.filter((s) => s.cee), (s) => s.gasto_2026);

  const sp = {
    rev: monthlyMetric(last12, (t) => agg([t]).rev),
    ebitda: monthlyMetric(last12, (t) => { const x = agg([t], all); return (x.contrib - FIXED_COST[mYear(t)]) / x.rev; }),
    vsb: monthlyMetric(last12, (t) => { const bb = budgetFor([t]); return bb ? agg([t]).rev / bb - 1 : 0; }),
    amz: monthlyMetric(last12, (t) => { const x = agg([t], all); return x.byCh[1].rev / x.rev; }),
    intl: monthlyMetric(last12, (t) => { const x = agg([t]); return x.rev ? 1 - x.byCo[0].rev / x.rev : 0; }),
    oee: monthlyMetric(last12, (t) => oeeAvg([t])),
    otif: last12.map((t) => D.ops[t][4]), edi: last12.map((t) => D.ops[t][2]), rec: last12.map((t) => D.ops[t][1]),
    wlead: last12.map((t) => D.hr[t][5]),
  };
  const drill = (tab, scrollTo, filter) => ({ view: 'mis', tab, scrollTo, filter });

  const el = mount('view-ess', `
    ${panelHead({ l: 'ess', levelName: 'Nivel estratégico', title: 'ESS · Sistema de información para ejecutivos', q: '¿Hacia dónde va Kaidora y qué riesgos hay en el camino?', extra: propagation() })}
    ${fichaHtml(FICHA_ESS)}
    <section class="grid g-5-7" aria-label="Resumen ejecutivo">
      <div class="card stack" style="gap:10px" id="ess-hero">
        <span class="eyebrow">Ventas · ${esc(per.label)}${noFlt ? '' : ' · ' + esc(filterText())}</span>
        <span class="hero-fig">${fmtEur(a.rev)}</span>
        <span class="kpi-foot" style="font-size:.9rem">${p ? deltaHtml(a.rev / p.rev - 1, { suffix: ' frente al mismo periodo del año anterior' }) : ''}</span>
        ${per.id === 'ytd' && noFlt ? `<div class="stack" style="gap:6px;margin-top:6px"><div class="row" style="justify-content:space-between;font-size:.88rem"><span>Avance sobre el objetivo 2026 (${fmtEur(TARGET_2026)})</span><b>${fmtPct(ytd26 / TARGET_2026, 0)}</b></div>${meterHtml(ytd26 / TARGET_2026, { tick: forecast / TARGET_2026, label: 'Avance sobre el objetivo anual' })}<span class="muted" style="font-size:.82rem">Previsión de cierre: <b>${fmtEur(forecast)}</b> (${signPct(forecast / TARGET_2026 - 1)} sobre el objetivo) si el Q4 crece como el resto del año. La marca negra indica la previsión.</span></div>` : `<p class="muted" style="font-size:.84rem">Selecciona «2026 (ene–sep)» sin filtros para ver el avance sobre el objetivo anual.</p>`}
      </div>
      <div data-slot="traj"></div>
    </section>
    <section class="stack" aria-labelledby="h-bsc" id="ess-bsc">
      <div class="tabs-row"><h2 id="h-bsc">Cuadro de mando integral</h2><span class="muted" style="font-size:.86rem">Pulsa un indicador para bajar al informe del MIS que lo explica</span></div>
      <div class="grid g2">
        <section class="card stack" style="gap:12px" aria-labelledby="h-p1"><h3 id="h-p1">${icon('chart')} Perspectiva financiera</h3><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          ${essTile({ label: 'Crecimiento de ventas', value: p ? signPct(a.rev / p.rev - 1) : '—', target: 'objetivo +15 %', lvl: p ? lvlUp(a.rev / p.rev - 1, 0.15, 0.08) : 'info', spark: sp.rev, drill: drill('ventas', 'mis-trend'), note: 'frente al año anterior' })}
          ${essTile({ label: 'Margen EBITDA estimado', value: ebitda != null ? fmtPct(ebitda) : '—', target: 'objetivo 12 %', lvl: ebitda != null ? lvlUp(ebitda, 0.12, 0.09) : 'info', spark: sp.ebitda, drill: drill('ventas', 'mis-trend'), note: ebitda != null ? 'contribución menos costes de estructura' : 'solo para el total de la empresa' })}
          ${essTile({ label: 'Ventas frente al presupuesto', value: b ? signPct(a.rev / b - 1) : '—', target: 'tolerancia ±3 %', lvl: b ? (a.rev / b - 1 >= -0.03 ? 'good' : a.rev / b - 1 >= -0.08 ? 'warn' : 'crit') : 'info', spark: sp.vsb, drill: drill('ventas', 'mis-exc') })}
          ${essTile({ label: 'Dependencia de Amazon', value: fmtPct(amzShare), target: 'umbral 35 %', lvl: lvlDown(amzShare, 0.35, 0.42), spark: sp.amz, drill: drill('ventas', 'mis-trend', { ch: 1 }), note: 'peso de Amazon en las ventas' })}
        </div></section>
        <section class="card stack" style="gap:12px" aria-labelledby="h-p2"><h3 id="h-p2">${icon('cart')} Perspectiva de clientes</h3><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          ${essTile({ label: 'Valoración en Amazon', value: dec(cu.valoracion_amazon, 1), unit: ' / 5', target: 'objetivo ≥ 4,5', lvl: lvlUp(cu.valoracion_amazon, 4.5, 4.2), drill: drill('clientes', 'mis-body'), note: `${fmtN(cu.resenas_amazon)} reseñas` })}
          ${essTile({ label: 'NPS de la tienda web', value: dec(npsAll, 0), target: 'objetivo 55', lvl: lvlUp(npsAll, 55, 45), drill: drill('clientes', 'mis-age'), note: `65 años o más: ${cu.nps[5]}` })}
          ${essTile({ label: 'Empresas clientes activas', value: fmtN(b2b[2][1]), target: 'objetivo 700', lvl: lvlUp(b2b[2][1], 700, 600), spark: b2b.map((x) => x[1]), drill: drill('ventas', 'mis-trend', { ch: 2 }), note: `${signPct(b2b[2][1] / b2b[1][1] - 1, 0)} frente a 2025` })}
          ${essTile({ label: 'Ventas internacionales', value: fmtPct(intl), target: 'objetivo 2027: 25 %', lvl: lvlUp(intl, 0.25, 0.15), spark: sp.intl, drill: drill('ventas', 'mis-trend') })}
        </div></section>
        <section class="card stack" style="gap:12px" aria-labelledby="h-p3"><h3 id="h-p3">${icon('factory')} Procesos internos <span class="ods-badge ods-9" style="margin-left:6px"><i>9</i></span></h3><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          ${essTile({ label: 'OEE de montaje', value: fmtPct(oee), target: 'objetivo 85 %', lvl: lvlUp(oee, 0.85, 0.75), spark: sp.oee, drill: drill('operaciones', 'mis-oee') })}
          ${essTile({ label: 'Entregas a tiempo (OTIF)', value: fmtPct(otif), target: 'objetivo 95 %', lvl: lvlUp(otif, 0.95, 0.92), spark: sp.otif, drill: drill('operaciones', 'mis-body') })}
          ${essTile({ label: 'Pedidos digitalizados', value: fmtPct(edi), target: 'objetivo 98 %', lvl: lvlUp(edi, 0.98, 0.95), spark: sp.edi, drill: drill('operaciones', 'mis-sup'), note: 'recibidos por API, EDI o web' })}
          ${essTile({ label: 'Envase reciclado', value: fmtPct(rec), target: 'objetivo 2027: 90 %', lvl: lvlUp(rec, 0.9, 0.75), spark: sp.rec, drill: drill('operaciones', 'mis-sup') })}
        </div></section>
        <section class="card stack" style="gap:12px" aria-labelledby="h-p4"><h3 id="h-p4">${icon('users')} Personas e inclusión <span class="ods-badge ods-5" style="margin-left:6px"><i>5</i></span><span class="ods-badge ods-10"><i>10</i></span></h3><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          ${essTile({ label: 'Mujeres en puestos de mando', value: fmtPct(leadersPct, 0), target: 'objetivo 2027: 45 %', lvl: lvlUp(leadersPct, 0.45, 0.35), spark: sp.wlead, drill: drill('personas', 'mis-glass'), note: `${HR.leadersW} de ${HR.leaders.length} personas` })}
          ${essTile({ label: 'Brecha salarial media', value: fmtPct(HR.gap), target: 'objetivo < 5 %', lvl: lvlDown(HR.gap, 0.05, 0.1), drill: drill('personas', 'mis-body'), note: `ajustada por puesto: ${fmtPct(HR.gapAdj)}` })}
          ${essTile({ label: 'Plantilla con discapacidad', value: fmtPct(discPct), target: 'mínimo legal 2 %', lvl: lvlUp(discPct, 0.02, 0.015), drill: drill('personas', 'mis-disc'), note: `${HR.disc} personas · compras a CEE: ${fmtEur(ceeSpend)}` })}
          ${essTile({ label: 'Accesibilidad de la web', value: fmtN(audLast), unit: ' / 100', target: 'objetivo 95', lvl: lvlUp(audLast, 95, 80), spark: cu.auditoria_web.map((x) => x[1]), drill: drill('clientes', 'mis-body'), note: 'obligatoria por la Ley 11/2023' })}
        </div></section>
      </div>
    </section>
    <div class="grid g-7-5">
      <div data-slot="mix"></div>
      <section class="card stack" style="gap:10px" aria-labelledby="h-alerts" id="ess-alerts"><h3 id="h-alerts">Alertas estratégicas</h3><div id="ess-alert-list" class="stack" style="gap:10px"></div></section>
    </div>
    <section class="card stack" aria-labelledby="h-ods" id="ess-ods">
      <div class="card-head" style="margin-bottom:0"><div><h3 id="h-ods">Indicadores ODS del plan estratégico 2027</h3><p class="card-sub">Situación a 30/09/2026 frente al objetivo de 2027. La barra muestra el avance; la marca, el objetivo.</p></div><button type="button" class="btn btn-sm" data-go="ods">${icon('heart')}Leer la reflexión</button></div>
      <div class="grid g3" id="ess-ods-grid"></div>
    </section>
    <section class="stack" aria-labelledby="h-ext">
      <h2 id="h-ext" style="font-size:1.2rem">Contexto externo</h2>
      <div class="kpis">
        ${kpiHtml({ label: 'Población de España', value: dec(D.external.poblacion_es / 1e6, 1), unit: ' M', foot: 'INE, 2025' })}
        ${kpiHtml({ label: 'Personas con discapacidad', value: dec(D.external.personas_discapacidad / 1e6, 2), unit: ' M', foot: 'INE, encuesta EDAD 2020' })}
        ${kpiHtml({ label: 'Población de 65 años o más', value: '≈ 20', unit: ' %', foot: 'INE' })}
        ${kpiHtml({ label: 'Adultos con diabetes', value: dec(D.external.prevalencia_diabetes * 100, 1), unit: ' %', foot: 'estudio Di@bet.es' })}
        ${kpiHtml({ label: 'Cuota estimada en botiquines online', value: fmtPct(D.external.cuota_mercado_online), foot: 'estimación simulada' })}
      </div>
    </section>`);

  // trayectoria acumulada por año
  const cum = (yr) => { let s = 0; return range(0, 11).map((m) => { const t = (yr - 2024) * 12 + m; if (t > LAST) return null; s += allAgg.byM.get(t).rev; return s; }); };
  const c24 = cum(2024), c25 = cum(2025), c26 = cum(2026);
  const seas = range(12, 23).map((t) => allAgg.byM.get(t).rev / sum(range(12, 23), (x) => allAgg.byM.get(x).rev));
  let acc = 0; const tgt = seas.map((s) => (acc += s * TARGET_2026));
  put(el, 'traj', chartCard({
    id: 'ess-traj', title: 'Trayectoria de ventas acumuladas', sub: 'Ventas acumuladas mes a mes de cada año, frente al objetivo 2026',
    legend: [{ name: '2026', color: 'var(--s1)', key: 'line' }, { name: 'Objetivo 2026', color: 'var(--ink-2)', key: 'line', dash: true }, { name: '2025', color: 'var(--neutral-mark)', key: 'line' }, { name: '2024', color: 'var(--axis)', key: 'line' }],
    easy: `2026 va por delante de 2025 todos los meses. A septiembre llevamos ${fmtEur(c26[8])}, un ${signPct(c26[8] / tgt[8] - 1)} frente a la senda del objetivo.`,
    table: { head: ['Mes', '2024', '2025', '2026', 'Objetivo 2026'], rows: range(0, 11).map((m) => [MES_L[m], fmtEur(c24[m]), fmtEur(c25[m]), c26[m] != null ? fmtEur(c26[m]) : '—', fmtEur(tgt[m])]), align: ['', 'r', 'r', 'r', 'r'] },
    draw: (c, w) => drawLine(c, w, {
      labels: MES.map((m) => m), h: 250, yFmt: eurAxis,
      series: [{ name: '2024', color: 'var(--axis)', values: c24, noLabel: true }, { name: '2025', color: 'var(--neutral-mark)', values: c25, noLabel: true }, { name: 'Objetivo 2026', color: 'var(--ink-2)', values: tgt, dash: true, noLabel: true }, { name: '2026', color: 'var(--s1)', values: c26, width: 3, fmt: (v) => fmtEur(v) }],
      tipTitle: (i) => `Acumulado a ${MES_L[i]}`, yFmtTip: (v) => fmtEur(v),
    }),
  }));
  // mix de canales por año
  const yrs = [['2024', range(0, 11)], ['2025', range(12, 23)], ['2026*', range(24, LAST)]];
  const mixRows = yrs.map(([l, m]) => { const x = agg(m, all); return { label: l, parts: x.byCh.map((c) => c.rev) }; });
  put(el, 'mix', chartCard({
    id: 'ess-mix', title: 'Diversificación de canales', sub: 'Peso de cada canal en las ventas anuales (*2026: enero a septiembre)',
    legend: D.channels.map((c, i) => ({ name: c.corto, color: CH_COLORS[i] })),
    easy: `La estrategia funciona: Amazon baja del ${fmtPct(mixRows[0].parts[1] / sum(mixRows[0].parts), 0)} al ${fmtPct(mixRows[2].parts[1] / sum(mixRows[2].parts), 0)} y la venta a empresas sube del ${fmtPct(mixRows[0].parts[2] / sum(mixRows[0].parts), 0)} al ${fmtPct(mixRows[2].parts[2] / sum(mixRows[2].parts), 0)}.`,
    table: { head: ['Año'].concat(D.channels.map((c) => c.corto)), rows: mixRows.map((r) => [r.label].concat(r.parts.map((v) => fmtPct(v / sum(r.parts))))), align: ['', 'r', 'r', 'r', 'r', 'r'] },
    draw: (c, w) => drawStack100(c, w, { rows: mixRows, series: D.channels.map((ch, i) => ({ name: ch.corto, color: CH_COLORS[i], ink: i === 3 || i === 2 ? '#10201a' : '#fff' })), fmtVal: (v) => fmtEur(v) }),
  }));
  // alertas
  const riskSup = D.suppliers.filter((s) => s.otif < 0.85);
  const alerts = [
    { lvl: amzShare > 0.35 ? 'warn' : 'good', t: 'Dependencia de Amazon', d: `Amazon supone el ${fmtPct(amzShare, 0)} de las ventas del periodo (umbral: 35 %). Un cambio en sus comisiones o en su algoritmo nos afectaría mucho.`, go: 'mis', opts: drill('ventas', 'mis-trend') },
    { lvl: 'crit', t: 'Riesgo de suministro', d: `${riskSup.map((s) => `${s.nombre} (${s.ciudad.split('(').pop().replace(')', '')})`).join(' y ')} entregan a tiempo menos del 85 % de los pedidos. El estuche EVA está hoy en nivel crítico en el TPS.`, go: 'tps', opts: { scrollTo: 'tps-stock' } },
    { lvl: leadersPct < 0.45 ? 'warn' : 'good', t: 'Techo de cristal', d: `Las mujeres son el ${fmtPct(HR.women / HR.total, 0)} de la plantilla, pero ocupan el ${fmtPct(leadersPct, 0)} de los puestos de mando.`, go: 'mis', opts: drill('personas', 'mis-glass') },
    { lvl: audLast < 95 ? 'serious' : 'good', t: 'Accesibilidad web obligatoria', d: `La Ley 11/2023 exige comercio electrónico accesible desde el 28/06/2025. Kaidora.es obtiene ${audLast}/100.`, go: 'mis', opts: drill('clientes', 'mis-body') },
    { lvl: kit.npv > 0 ? 'good' : 'warn', t: 'Oportunidad: Kit Accesible', d: `El DSS estima un VAN de ${fmtEur(kit.npv)} a 3 años en el escenario base, con impacto social positivo.`, go: 'dss', opts: { tab: 'kit' } },
    { lvl: cap.service >= 0.995 ? 'good' : 'warn', t: 'Capacidad para la campaña de Navidad', d: `Con el plan base, el nivel de servicio previsto es del ${fmtPct(cap.service)}.`, go: 'dss', opts: { tab: 'cap' } },
  ];
  const order = { crit: 0, serious: 1, warn: 2, good: 3 };
  alerts.sort((x, y) => order[x.lvl] - order[y.lvl]);
  $('#ess-alert-list').innerHTML = alerts.map((al) => `<button type="button" class="kpi" data-go="${al.go}" data-go-opts='${esc(JSON.stringify(al.opts))}' style="gap:6px">${icon('drill', 'drill')}<span>${statusChip(al.lvl, { crit: 'Crítico', serious: 'Importante', warn: 'Vigilar', good: 'Favorable' }[al.lvl])}</span><b>${esc(al.t)}</b><span class="ink2" style="font-size:.86rem">${esc(al.d)}</span></button>`).join('');
  // ODS
  const odsItem = (label, now, target, fmt, inverse = false, note = '') => {
    const prog = inverse ? clamp(target / Math.max(now, 1e-9), 0, 1) : clamp(now / target, 0, 1);
    const lvl = prog >= 0.98 ? 'good' : prog >= 0.8 ? 'warn' : 'serious';
    return `<div class="stack" style="gap:5px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:baseline"><span style="font-size:.88rem">${label}</span><b class="num" style="white-space:nowrap">${fmt(now)}</b></div>
      ${meterHtml(prog, { cls: lvl === 'good' ? '' : lvl === 'warn' ? 'warn' : 'crit', tick: inverse ? null : 1, label: `${label}: ${fmt(now)}, objetivo ${fmt(target)}` })}
      <span class="muted" style="font-size:.78rem">Objetivo 2027: ${fmt(target)}${note ? ' · ' + note : ''}</span></div>`;
  };
  $('#ess-ods-grid').innerHTML = `
    <div class="stack" style="gap:14px"><span class="ods-badge ods-5"><i>5</i>Igualdad de género</span>
      ${odsItem('Mujeres en puestos de mando', leadersPct, 0.45, (v) => fmtPct(v, 0))}
      ${odsItem('Brecha salarial media', HR.gap, 0.05, (v) => fmtPct(v), true, 'cuanto más baja, mejor')}
      <p class="ink2" style="font-size:.84rem">El ${fmtPct(ptW, 0)} de los contratos a tiempo parcial son de mujeres: la parcialidad explica parte de la brecha anual.</p></div>
    <div class="stack" style="gap:14px"><span class="ods-badge ods-9"><i>9</i>Industria e innovación</span>
      ${odsItem('OEE de montaje', oee, 0.85, (v) => fmtPct(v, 0))}
      ${odsItem('Pedidos digitalizados', edi, 0.98, (v) => fmtPct(v, 0))}
      ${odsItem('Energía renovable (Paterna)', renew[0], 0.6, (v) => fmtPct(v, 0), false, 'placas solares desde 2025')}</div>
    <div class="stack" style="gap:14px"><span class="ods-badge ods-10"><i>10</i>Reducción de desigualdades</span>
      ${odsItem('Plantilla con discapacidad', discPct, 0.03, (v) => fmtPct(v, 1))}
      ${odsItem('Formación de mayores de 55 frente a la media', form55, 1, (v) => fmtPct(v, 0))}
      ${odsItem('Accesibilidad de kaidora.es', audLast, 95, (v) => `${dec(v, 0)}/100`)}
      ${odsItem('Compradores web de 65 años o más', cu.compradores[5], 0.12, (v) => fmtPct(v, 0))}</div>`;
};
