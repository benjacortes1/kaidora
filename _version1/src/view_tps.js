/* ===================================================================== view_tps.js
   TPS: jornada simulada del 30/09/2026 con la hora real del dispositivo.
   - Pedidos en vivo (simulación acelerada) y formulario de alta de pedidos.
   - Órdenes de montaje que consumen componentes según la lista de materiales.
   - Inventario con lotes, caducidades (FEFO) y solicitudes de compra.
   Todo lo que se registra aquí se suma a septiembre de 2026 en MIS y ESS. */

const BOM = {
  emp: { C01: 6, C02: 2, C03: 20, C04: 1, C05: 2, C06: 4, C07: 6, C08: 1, C14: 1, C16: 1, C12: 1, C17: 1 },
  veh: { C01: 2, C03: 10, C05: 1, C06: 2, C07: 2, C08: 1, C14: 1, C12: 1, C17: 1 },
  inf: { C01: 3, C03: 15, C06: 2, C07: 3, C15: 1, C12: 1, C17: 1 },
  fam: { C01: 5, C02: 2, C03: 20, C04: 1, C05: 2, C06: 4, C07: 5, C08: 1, C09: 1, C14: 1, C15: 1, C13: 1, C17: 1 },
  via: { C01: 2, C03: 10, C06: 2, C07: 3, C14: 1, C17: 1 },
  dep: { C01: 3, C02: 2, C03: 12, C05: 1, C07: 3, C08: 1, C09: 2, C12: 1, C17: 1 },
  dia: { C10: 2, C11: 1, C07: 4, C03: 6, C12: 1, C17: 1 },
  per: { C01: 6, C02: 2, C03: 20, C04: 1, C05: 2, C06: 4, C07: 6, C08: 1, C14: 1, C16: 1, C13: 1, C17: 1 },
};
const STATUS_FLOW = [[5, 'Recibido', 'info'], [30, 'Validado', 'info'], [120, 'En preparación', 'warn'], [1e9, 'Expedido', 'good']];
const ACCESS_FMT = ['Letra grande', 'Braille', 'Lectura fácil'];
const CUST_AGES = D.customers.bandas;

const TPS = (() => {
  const r = rng(20260930);
  const sepAll = agg([LAST], { ch: -1, li: -1, co: -1 });
  const days = [30, 30, 22, 22, 22];
  const exp = D.channels.map((c, i) => sepAll.byCh[i].orders / days[i]);
  const B2C = [0.8, 0.5, 0.3, 0.2, 0.2, 0.3, 0.7, 1.5, 2.5, 3.5, 4.2, 4.5, 4.6, 4.2, 3.8, 3.9, 4.0, 4.2, 4.6, 5.2, 6.0, 6.2, 5.0, 2.5];
  const B2B = [0, 0, 0, 0, 0, 0, 0, 0.3, 2.5, 4.5, 5, 5, 4, 2, 3, 3.5, 3, 2, 0.8, 0.2, 0, 0, 0, 0];
  const norm = (a) => { const s = sum(a); return a.map((x) => x / s); };
  const WH = [norm(B2C), norm(B2C), norm(B2B), norm(B2B), norm(B2B)];
  // mix de línea y país por canal (septiembre de 2026) y precio unitario medio por combinación
  const mix = D.channels.map(() => ({ li: new Array(8).fill(0), co: new Array(5).fill(0) }));
  const price = {};
  FACTS_BY_M[LAST].forEach((f) => { mix[f[1]].li[f[2]] += f[4]; mix[f[1]].co[f[3]] += f[4]; price[`${f[1]}|${f[2]}|${f[3]}`] = f[5] / f[4]; });
  const unitPrice = (c, li, k) => price[`${c}|${li}|${k}`] || D.lines[li].pvp * D.channels[c].price;

  const clock = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const t0 = clock();
  const hourly = Array.from({ length: 24 }, () => new Array(5).fill(0));
  const curH = Math.floor(t0 / 60);
  for (let h = 0; h <= curH; h++) {
    const frac = h < curH ? 1 : (t0 - h * 60) / 60;
    for (let c = 0; c < 5; c++) hourly[h][c] = Math.round(exp[c] * WH[c][h] * frac * lnorm(r, 0.12));
  }
  let seq = 41873 + Math.round(sum(hourly.flat()));
  const log = [];
  function makeOrder(minute, forced = {}) {
    const h = Math.min(23, Math.floor(minute / 60));
    const c = forced.c != null ? forced.c : pickW(r, D.channels.map((_, i) => Math.max(0.02, exp[i] * WH[i][h])));
    const li = forced.li != null ? forced.li : pickW(r, mix[c].li);
    const k = forced.k != null ? forced.k : pickW(r, mix[c].co);
    const units = forced.units != null ? forced.units : (c < 2 ? (r() < 0.78 ? 1 : r() < 0.8 ? 2 : 3) : Math.max(2, Math.round(D.channels[c].upo * lnorm(r, 0.45))));
    const amount = Math.round(units * unitPrice(c, li, k) * 100) / 100;
    const isWeb = c === 0;
    const o = {
      id: 'S0' + (++seq), minute, c, li, k, units, amount,
      assisted: forced.assisted != null ? forced.assisted : (isWeb && r() < 0.033),
      access: forced.access != null ? forced.access : (isWeb && r() < 0.018 ? ACCESS_FMT[Math.floor(r() * 3)] : ''),
      age: forced.age != null ? forced.age : (isWeb && r() < 0.38 ? CUST_AGES[pickW(r, D.customers.compradores)] : ''),
      manual: !!forced.manual,
    };
    return o;
  }
  // últimas transacciones del día (antes de abrir el panel)
  for (let i = 18; i >= 1; i--) log.push(makeOrder(Math.max(0, t0 - i * (1.2 + r() * 1.6))));
  log.reverse();

  const prod = {
    plan: [2840, 540],
    shifts: [[[6, 14], [14, 22]], [[7, 15]]],
    rate: [1420 / 8, 540 / 8],
    extra: [0, 0],
    eff: [0.97 + r() * 0.02, 0.95 + r() * 0.03],
  };
  function built(n, minute = clock()) {
    let hrs = 0;
    prod.shifts[n].forEach(([a, b]) => { hrs += clamp(minute / 60, a, b) - a; });
    return Math.round(hrs * prod.rate[n] * prod.eff[n]) + prod.extra[n];
  }
  // stock a las 06:00 (datos del inventario) y consumo acumulado del día
  const stock0 = Object.fromEntries(D.components.map((c) => [c.id, c.stock]));
  const used = Object.fromEntries(D.components.map((c) => [c.id, 0]));
  const requests = {};   // solicitudes de compra creadas hoy
  const mos = [];        // órdenes de montaje lanzadas hoy
  function dayFrac(minute = clock()) { return clamp((minute / 60 - 6) / 16, 0, 1); }
  function stockOf(c) { return Math.round(stock0[c.id] - c.consumo * dayFrac() - used[c.id]); }

  const web0 = sum(hourly.map((row) => row[0]));
  const support = { as: Math.round(web0 * 0.033), ac: Math.round(web0 * 0.018) };
  return {
    r, exp, hourly, log, prod, mos, requests, unitPrice, clock, makeOrder, built, stockOf, used, support,
    ordersToday() { return Math.round(sum(this.hourly.flat())); },
    amountToday() { return sum(this.hourly.map((row) => sum(row.map((n, c) => n * (sepAll.byCh[c].rev / sepAll.byCh[c].orders))))); },
    register(o) {
      this.log.unshift(o); if (this.log.length > 60) this.log.pop();
      const h = Math.min(23, Math.floor(o.minute / 60));
      this.hourly[h][o.c] += 1;
      if (o.assisted) this.support.as += 1;
      if (o.access) this.support.ac += 1;
      const ln = D.lines[o.li], ch = D.channels[o.c];
      S.extra.push([LAST, o.c, o.li, o.k, o.units, Math.round(o.amount), Math.round(o.units * ln.cost * 1.06), Math.round(o.amount * ch.fee), Math.round(o.units * ch.log), 0]);
      Bus.emit('tx', o);
    },
  };
})();

function orderStatus(o) {
  const age = TPS.clock() - o.minute;
  const s = STATUS_FLOW.find(([lim]) => age < lim);
  return { txt: s[1], lvl: s[2] };
}
function hhmm(minute) { const m = Math.max(0, Math.floor(minute)); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
function compState(c) {
  const st = TPS.stockOf(c);
  if (st <= c.ss) return ['crit', 'Crítico'];
  if (st <= c.rop) return ['warn', 'Reponer'];
  return ['good', 'Correcto'];
}
function expiresSoon(c) {
  if (!/^\d{4}-\d{2}$/.test(c.cad)) return false;
  const [y, m] = c.cad.split('-').map(Number);
  return (y - 2026) * 12 + (m - 9) <= 6;
}

/* ---------------------------------------------------------------- simulación en vivo */
let liveTimer = null;
function setLive(on) {
  S.live = on;
  store('live', on);
  const cb = document.getElementById('a11y-live'); if (cb) cb.checked = !on;
  $$('.live-dot').forEach((d) => d.classList.toggle('paused', !on));
  $$('[data-live-label]').forEach((d) => { d.textContent = on ? 'En vivo' : 'En pausa'; });
  $$('[data-live-btn]').forEach((b) => { b.innerHTML = on ? `${icon('pause')}<span>Pausar</span>` : `${icon('resume')}<span>Reanudar</span>`; b.setAttribute('aria-label', on ? 'Pausar la simulación en vivo' : 'Reanudar la simulación en vivo'); });
  clearTimeout(liveTimer);
  if (on) scheduleLive();
}
function scheduleLive() {
  liveTimer = setTimeout(() => {
    if (S.live) { const o = TPS.makeOrder(TPS.clock()); o.fresh = true; TPS.register(o); scheduleLive(); }
  }, 3800 + Math.random() * 3200);
}
function flashProp(nodes) {
  $$('.prop').forEach((p) => {
    nodes.forEach((n, i) => setTimeout(() => {
      const el = p.querySelector(`[data-node="${n}"]`); if (!el) return;
      el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 1400);
    }, reducedMotion() ? 0 : i * 260));
  });
}

/* ---------------------------------------------------------------- vista */
const FICHA_TPS = {
  datos: ['Pedidos y líneas de pedido (canal, kit, unidades, precio, país)', 'Órdenes de montaje y consumo de componentes', 'Movimientos de stock con <strong>lote y caducidad</strong>', 'Recepciones, devoluciones, albaranes y facturas'],
  nivel: 'Operacional',
  nivelTxt: 'Decisiones estructuradas y repetitivas: aceptar un pedido, qué lote sale primero (FEFO), cuándo reponer.',
  usuarios: ['Operarios/as de montaje y jefes/as de turno', 'Personal de almacén y expediciones', 'Atención al cliente', 'Administración (facturación)'],
  frecuencia: 'En tiempo real, transacción a transacción',
  formato: 'Formularios de alta, listados detallados, etiquetas de envío, albaranes y alertas de stock.',
  ejemplos: ['Pedidos de Amazon que entran por la API de Seller Central y se preparan para FBA', 'Pedidos de farmacias por el estándar Fedicom, habitual en la distribución farmacéutica', 'SGA con lector de códigos de barras y salida FEFO (lo primero que caduca, primero sale)', 'Trazabilidad por lote de productos sanitarios (Reglamento UE 2017/745)'],
  porque: 'Sin un registro fiable de cada pedido, lote y movimiento, Kaidora no puede servir, facturar ni retirar un lote defectuoso. Es la base de datos de la que beben todos los demás sistemas.',
};

RENDER.tps = function () {
  const el = mount('view-tps', `
    ${panelHead({ l: 'tps', levelName: 'Nivel operacional', title: 'TPS · Sistema de procesamiento de transacciones', q: '¿Qué está pasando ahora mismo en Kaidora?',
      extra: `<span class="sim-chip"><span class="live-dot${S.live ? '' : ' paused'}"></span><span data-live-label>${S.live ? 'En vivo' : 'En pausa'}</span><span class="long">· simulación acelerada</span></span><button type="button" class="btn btn-sm" data-live-btn></button>` })}
    ${fichaHtml(FICHA_TPS)}
    <div class="row" style="justify-content:space-between"><h2 style="font-size:1.25rem">Jornada del miércoles 30/09/2026 <span class="muted" style="font-weight:500;font-size:1rem">· <span id="tps-clock"></span></span></h2>${propagation()}</div>
    <div class="kpis" id="tps-kpis"></div>
    <div class="grid g-8-4">
      <div class="stack">
        <section class="card" aria-labelledby="h-log" id="tps-log-card">
          <div class="card-head"><div><h3 id="h-log">Registro de transacciones</h3><p class="card-sub">Últimos pedidos de todos los canales. <span id="tps-log-filter"></span></p></div>
          <span class="tag">${icon('data')}Odoo · Ventas</span></div>
          <div class="table-wrap" style="max-height:430px"><table class="t nowrap compact" aria-describedby="h-log"><thead><tr>
            <th scope="col">Hora</th><th scope="col">Pedido</th><th scope="col">Canal · país</th><th scope="col">Kit</th><th scope="col" class="r">Uds.</th><th scope="col" class="r">Importe</th><th scope="col">Estado</th><th scope="col">Inclusión</th>
          </tr></thead><tbody id="tps-log" aria-live="off"></tbody></table></div>
        </section>
        <div data-slot="hourly"></div>
      </div>
      <div class="stack">
        <section class="card" aria-labelledby="h-forms" id="tps-forms">
          <div class="card-head" style="margin-bottom:10px"><h3 id="h-forms">Registrar una transacción</h3></div>
          <div class="seg" role="tablist" aria-label="Tipo de transacción" style="margin-bottom:14px">
            <button type="button" role="tab" id="tab-ord" aria-selected="true" aria-controls="form-ord">Nuevo pedido</button>
            <button type="button" role="tab" id="tab-mo" aria-selected="false" aria-controls="form-mo">Orden de montaje</button>
          </div>
          <form class="form" id="form-ord" role="tabpanel" aria-labelledby="tab-ord" novalidate></form>
          <form class="form" id="form-mo" role="tabpanel" aria-labelledby="tab-mo" hidden novalidate></form>
        </section>
        <section class="card stack" style="gap:14px" aria-labelledby="h-prod" id="tps-prod">
          <div><h3 id="h-prod">Montaje de hoy por nave</h3><p class="card-sub">Kits montados frente al plan del día</p></div>
          <div id="tps-prod-body" class="stack" style="gap:14px"></div>
          <div id="tps-mos"></div>
        </section>
      </div>
    </div>
    <section class="card" aria-labelledby="h-stock" id="tps-stock">
      <div class="card-head"><div><h3 id="h-stock">Inventario de componentes</h3><p class="card-sub">Stock en tiempo real, cobertura en días de consumo y lote que debe salir primero (FEFO). Las alertas se generan cuando el stock cruza el punto de pedido.</p></div>
      <span class="tag">${icon('box')}Odoo · Inventario</span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Componente</th><th scope="col" class="r">Stock</th><th scope="col" style="min-width:150px">Cobertura</th><th scope="col">Estado</th><th scope="col">Lote FEFO · caducidad</th><th scope="col">Proveedor</th><th scope="col">Acción</th></tr></thead><tbody id="tps-stock-body"></tbody></table></div>
    </section>
    <div class="callout">${icon('shield')}<div><h4>Inclusión desde el origen del dato</h4><p>El formulario de pedido recoge tres campos opcionales: tipo de atención (autoservicio o asistida por teléfono), formato accesible de las instrucciones y rango de edad. No se pide ningún dato de salud ni de discapacidad (son datos de categoría especial según el art. 9 del RGPD). Solo se guarda la necesidad de formato, con consentimiento y siempre para usarla de forma agregada.</p></div></div>
  `);
  put(el, 'hourly', chartCard({
    id: 'tps-hourly-card',
    title: 'Pedidos por hora (hoy)',
    sub: 'Pedidos recibidos en cada franja horaria, por canal. La hora actual está resaltada.',
    legend: D.channels.map((c, i) => ({ name: c.corto, color: CH_COLORS[i] })),
    easy: 'Los clientes particulares compran sobre todo al mediodía y por la noche; las empresas y farmacias piden en horario de oficina.',
    table: { head: ['Hora'].concat(D.channels.map((c) => c.corto)), rows: TPS.hourly.map((row, h) => [`${h}:00`].concat(row.map(fmtN))), align: ['', 'r', 'r', 'r', 'r', 'r'] },
    draw: (c, w) => drawCols(c, w, {
      labels: range(0, 23).map((h) => String(h)), mode: 'stack', h: 220, highlight: Math.floor(TPS.clock() / 60), dimOthers: false, topLabels: 'highlight',
      series: D.channels.map((ch, i) => ({ name: ch.corto, color: CH_COLORS[i], values: TPS.hourly.map((row) => row[i]) })),
      yFmt: fmtN, tipTitle: (i) => `De ${i}:00 a ${i}:59`, xEvery: w < 500 ? 3 : 2,
    }),
  }));
  buildOrderForm(); buildMoForm();
  $('#tab-ord').addEventListener('click', () => switchFormTab('ord'));
  $('#tab-mo').addEventListener('click', () => switchFormTab('mo'));
  $$('#tps-forms [role="tab"]').forEach((t) => t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); switchFormTab(t.id === 'tab-ord' ? 'mo' : 'ord'); $(t.id === 'tab-ord' ? '#tab-mo' : '#tab-ord').focus(); } }));
  $('[data-live-btn]', el).addEventListener('click', () => setLive(!S.live));
  setLive(S.live);
  updateTps();
};
function switchFormTab(which) {
  $('#tab-ord').setAttribute('aria-selected', String(which === 'ord'));
  $('#tab-mo').setAttribute('aria-selected', String(which === 'mo'));
  $('#form-ord').hidden = which !== 'ord'; $('#form-mo').hidden = which !== 'mo';
}

function updateTps(part = 'all') {
  if (S.view !== 'tps' || !$('#tps-kpis')) return;
  const now = TPS.clock();
  $('#tps-clock').textContent = `${hhmm(now)} h`;
  const orders = TPS.ordersToday();
  const expectedDay = sum(TPS.exp);
  const built = [0, 1].map((n) => TPS.built(n));
  const pendingShip = Math.round(140 + sum(TPS.hourly.slice(Math.max(0, Math.floor(now / 60) - 2)).flat()) * 0.8);
  const todayManual = TPS.support.as;
  const todayAccess = TPS.support.ac;
  const critical = D.components.filter((c) => compState(c)[0] === 'crit').length;
  $('#tps-kpis').innerHTML = [
    kpiHtml({ label: 'Pedidos registrados hoy', value: fmtN(orders), foot: `previsión del día: ~${fmtN(expectedDay)}` }),
    kpiHtml({ label: 'Importe registrado hoy', value: fmtEur(TPS.amountToday()), foot: 'todos los canales, IVA no incluido' }),
    kpiHtml({ label: 'Kits montados hoy', value: fmtN(sum(built)), foot: `${fmtPct(sum(built) / sum(TPS.prod.plan), 0)} del plan (${fmtN(sum(TPS.prod.plan))})` }),
    kpiHtml({ label: 'Pendientes de expedir', value: fmtN(pendingShip), foot: 'pedidos validados sin salir del almacén' }),
    kpiHtml({ label: 'Alertas de stock', value: fmtN(critical), unit: critical === 1 ? ' crítica' : ' críticas', foot: statusChip(critical ? 'crit' : 'good', critical ? 'Revisar inventario' : 'Sin roturas') }),
    kpiHtml({ label: 'Pedidos con apoyo', value: fmtN(todayManual + todayAccess), foot: `${todayManual} asistidos por teléfono · ${todayAccess} con formato accesible` }),
  ].join('');
  // registro
  const f = S.f;
  const rows = TPS.log.filter((o) => (f.ch < 0 || o.c === f.ch) && (f.li < 0 || o.li === f.li) && (f.co < 0 || o.k === f.co)).slice(0, 14);
  $('#tps-log-filter').textContent = f.ch >= 0 || f.li >= 0 || f.co >= 0 ? `Filtrado por: ${filterText()}.` : '';
  $('#tps-log').innerHTML = rows.length ? rows.map((o) => {
    const st = orderStatus(o);
    const inc = [o.assisted ? `<span class="tag" title="Atención asistida por teléfono">${icon('phone')}Asistido</span>` : '', o.access ? `<span class="tag brand" title="Formato accesible solicitado">${icon('eye')}${esc(o.access)}</span>` : '', o.age ? `<span class="tag" title="Rango de edad declarado con consentimiento">${esc(o.age)}</span>` : ''].join(' ');
    return `<tr data-id="${o.id}"${o.fresh ? ' class="flash"' : ''}><td class="num">${hhmm(o.minute)}</td><td class="mono">${o.id}${o.manual ? ' <span class="tag brand">manual</span>' : ''}</td><td><i class="swatch" style="background:${CH_COLORS[o.c]}"></i>${esc(D.channels[o.c].corto)} <span class="muted">· ${D.countries[o.k].id}</span></td><td>${esc(D.lines[o.li].nombre)}</td><td class="r">${fmtN(o.units)}</td><td class="r">${dec(o.amount, 2)} €</td><td>${statusChip(st.lvl, st.txt)}</td><td>${inc || '<span class="muted">—</span>'}</td></tr>`;
  }).join('') : '<tr><td colspan="8" class="muted">No hay pedidos recientes con estos filtros. Cambia el canal, la línea o el país en la barra de filtros.</td></tr>';
  TPS.log.forEach((o) => { o.fresh = false; });
  if (part === 'live') return;
  // producción
  $('#tps-prod-body').innerHTML = D.naves.map((n, i) => {
    const b = built[i], p = TPS.prod.plan[i], frac = b / p;
    const shifts = TPS.prod.shifts[i].map(([a, z]) => `${a}:00–${z}:00`).join(' y ');
    return `<div class="stack" style="gap:6px"><div class="row" style="justify-content:space-between"><b>${esc(n.nombre)}</b><span class="num"><b>${fmtN(b)}</b> / ${fmtN(p)} kits</span></div>
      ${meterHtml(frac, { tick: dayFracProd(i), label: `${n.nombre}: ${fmtPct(frac, 0)} del plan` })}
      <span class="muted" style="font-size:.8rem">Turnos ${shifts}. La marca negra indica dónde deberíamos ir a esta hora.</span></div>`;
  }).join('');
  $('#tps-mos').innerHTML = TPS.mos.length ? `<h4 style="margin:4px 0 6px">Órdenes de montaje lanzadas hoy</h4><ul style="margin:0;padding-left:1.1em;display:grid;gap:4px;font-size:.86rem">${TPS.mos.slice(0, 5).map((m) => `<li><span class="mono">${m.id}</span> · ${fmtN(m.qty)} × ${esc(D.lines[m.li].nombre)} · ${esc(D.naves[m.n].nombre)} · ${statusChip(m.done ? 'good' : 'warn', m.done ? 'Completada' : 'En curso')}</li>`).join('')}</ul>` : '';
  // inventario
  $('#tps-stock-body').innerHTML = D.components.map((c) => {
    const st = TPS.stockOf(c); const [lvl, txt] = compState(c); const cover = st / c.consumo;
    const req = TPS.requests[c.id];
    const sup = D.suppliers.find((s) => s.id === c.prov);
    const soon = expiresSoon(c);
    const action = req ? `<span class="tag brand">${icon('check')}${req.id}</span>` : (lvl !== 'good' ? `<button type="button" class="btn btn-sm" data-req="${c.id}">${icon('cart')}Pedir</button>` : '<span class="muted">—</span>');
    return `<tr><td><b>${esc(c.nombre)}</b>${c.sanitario ? ' <span class="tag" title="Producto sanitario: trazabilidad por lote obligatoria">PS</span>' : ''}</td>
      <td class="r">${fmtN(st)}</td>
      <td><div class="stack" style="gap:3px"><span class="num" style="font-size:.8rem">${dec(cover, 1)} días</span>${meterHtml(clamp(cover / 20, 0, 1), { cls: lvl === 'crit' ? 'crit' : lvl === 'warn' ? 'warn' : '', tick: c.rop / c.consumo / 20, label: `Cobertura ${dec(cover, 1)} días` })}</div></td>
      <td>${statusChip(lvl, txt)}</td>
      <td><span class="mono">${esc(c.lote)}</span> · ${c.cad === '—' ? '<span class="muted">sin caducidad</span>' : esc(c.cad)}${soon ? ' ' + statusChip('serious', 'Sale primero') : ''}</td>
      <td style="font-size:.84rem">${esc(sup.nombre)}${sup.cee ? ' <span class="tag brand">CEE</span>' : ''}<br><span class="muted">plazo ${sup.lead} días</span></td>
      <td>${action}</td></tr>`;
  }).join('');
}
function dayFracProd(n) {
  const m = TPS.clock() / 60; let hrs = 0, tot = 0;
  TPS.prod.shifts[n].forEach(([a, b]) => { hrs += clamp(m, a, b) - a; tot += b - a; });
  return hrs / tot;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-req]'); if (!b) return;
  const c = D.components.find((x) => x.id === b.dataset.req); const sup = D.suppliers.find((s) => s.id === c.prov);
  const id = 'SC/26/' + String(Object.keys(TPS.requests).length + 318).padStart(4, '0');
  const eta = new Date(SIM_DATE.getTime() + sup.lead * 864e5);
  TPS.requests[c.id] = { id, eta };
  toast(`Solicitud de compra ${id} creada`, `${fmtN(c.rop * 2 - TPS.stockOf(c))} uds. de ${c.nombre} a ${sup.nombre}. Llegada estimada: ${eta.toLocaleDateString('es-ES')}.`, 'cart');
  updateTps();
});

/* ---------------------------------------------------------------- formularios */
const CH_COUNTRIES = { web: ['ES', 'PT', 'FR'], amz: ['ES', 'PT', 'FR', 'IT', 'DE'], b2b: ['ES', 'PT'], far: ['ES', 'PT'], dis: ['ES', 'PT', 'FR'] };
function opts(list, sel) { return list.map(([v, t]) => `<option value="${v}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join(''); }
function buildOrderForm() {
  const f = $('#form-ord');
  f.innerHTML = `
    <div class="form-row">
      <div class="field"><label for="o-ch">Canal</label><select class="select" id="o-ch">${opts(D.channels.map((c, i) => [i, c.corto]), 0)}</select></div>
      <div class="field"><label for="o-li">Kit</label><select class="select" id="o-li">${opts(D.lines.map((l, i) => [i, l.nombre]), 1)}</select></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="o-u">Unidades</label><input class="input" id="o-u" type="number" inputmode="numeric" min="1" max="5000" value="2" aria-describedby="o-u-err"><span class="err" id="o-u-err" hidden></span></div>
      <div class="field"><label for="o-co">País de entrega</label><select class="select" id="o-co"></select></div>
    </div>
    <fieldset class="inclu"><legend>Inclusión · campos opcionales</legend>
      <div class="field"><label for="o-at">Tipo de atención</label><select class="select" id="o-at">${opts([['self', 'Autoservicio (web o app)'], ['phone', 'Asistida por teléfono']], 'self')}</select></div>
      <div class="field"><label for="o-ac">¿Instrucciones en formato accesible?</label><select class="select" id="o-ac">${opts([['', 'No lo necesita']].concat(ACCESS_FMT.map((a) => [a, a])), '')}</select></div>
      <div class="field"><label for="o-age">Rango de edad</label><select class="select" id="o-age">${opts([['', 'Prefiere no indicarlo']].concat(CUST_AGES.map((a) => [a, a + ' años'])), '')}</select><span class="hint">Solo se usa de forma agregada para detectar brechas de acceso.</span></div>
      <label class="check"><input type="checkbox" id="o-consent"><span>El cliente consiente que guardemos el rango de edad y la preferencia de formato para mejorar el servicio.</span></label>
      <span class="err" id="o-consent-err" hidden></span>
    </fieldset>
    <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:.84rem" id="o-preview"></span><button type="submit" class="btn btn-primary">${icon('check')}Registrar pedido</button></div>`;
  const ch = $('#o-ch'), co = $('#o-co'), u = $('#o-u');
  const fillCo = () => {
    const list = CH_COUNTRIES[D.channels[+ch.value].id];
    co.innerHTML = opts(list.map((id) => [D.countries.findIndex((c) => c.id === id), D.countries.find((c) => c.id === id).nombre]), 0);
    if (+ch.value >= 2 && +u.value < 5) u.value = Math.round(D.channels[+ch.value].upo);
    if (+ch.value < 2 && +u.value > 10) u.value = 1;
    preview();
  };
  const preview = () => {
    const units = Math.round(+u.value || 0);
    const p = TPS.unitPrice(+ch.value, +$('#o-li').value, +co.value || 0);
    $('#o-preview').textContent = units > 0 ? `Importe estimado: ${dec(units * p, 2)} €` : '';
  };
  ch.addEventListener('change', fillCo); $('#o-li').addEventListener('change', preview); u.addEventListener('input', preview); co.addEventListener('change', preview);
  fillCo();
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    const units = Number(u.value);
    const uErr = $('#o-u-err');
    if (!Number.isInteger(units) || units < 1 || units > 5000) { uErr.textContent = 'Introduce un número entero de unidades entre 1 y 5.000.'; uErr.hidden = false; u.setAttribute('aria-invalid', 'true'); ok = false; } else { uErr.hidden = true; u.removeAttribute('aria-invalid'); }
    const age = $('#o-age').value, acc = $('#o-ac').value, consent = $('#o-consent').checked;
    const cErr = $('#o-consent-err');
    if ((age || acc) && !consent) { cErr.textContent = 'Para guardar la edad o el formato accesible necesitamos el consentimiento del cliente. Si no lo da, deja esos campos sin indicar.'; cErr.hidden = false; ok = false; } else cErr.hidden = true;
    if (!ok) { (u.getAttribute('aria-invalid') ? u : $('#o-consent')).focus(); return; }
    const o = TPS.makeOrder(TPS.clock(), { c: +ch.value, li: +$('#o-li').value, k: +co.value, units, assisted: $('#o-at').value === 'phone', access: acc, age, manual: true });
    o.fresh = true;
    TPS.register(o);
    const nodes = ['tps', 'mis'].concat(acc ? ['dss'] : [], ['ess']);
    flashProp(nodes);
    toast(`Pedido ${o.id} registrado`, `${fmtN(units)} × ${D.lines[o.li].nombre} (${dec(o.amount, 2)} €). Ya suma en el MIS (ventas de septiembre) y en el ESS (ventas 2026)${acc ? '; el DSS cuenta una petición más de formato accesible' : ''}.`);
    $('#o-consent').checked = false; $('#o-age').value = ''; $('#o-ac').value = ''; $('#o-at').value = 'self';
  });
}
function buildMoForm() {
  const f = $('#form-mo');
  f.innerHTML = `
    <div class="form-row">
      <div class="field"><label for="m-li">Kit a montar</label><select class="select" id="m-li">${opts(D.lines.map((l, i) => [i, l.nombre]), 3)}</select></div>
      <div class="field"><label for="m-n">Nave</label><select class="select" id="m-n">${opts(D.naves.map((n, i) => [i, n.nombre]), 0)}</select></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="m-q">Cantidad de kits</label><input class="input" id="m-q" type="number" inputmode="numeric" min="10" max="3000" step="10" value="200"><span class="err" id="m-q-err" hidden></span></div>
      <div class="field"><label for="m-resp">Responsable</label><select class="select" id="m-resp">${opts([['E021', 'E021 · Jefa de turno (mañana)'], ['E024', 'E024 · Jefe de turno (tarde)'], ['E080', 'E080 · Jefe de almacén (Riba-roja)']], 'E021')}</select><span class="hint">Identificadores seudonimizados.</span></div>
    </div>
    <div class="field"><span class="lab">Componentes que se consumirán (lista de materiales)</span><div id="m-bom" style="font-size:.84rem;color:var(--ink-2)"></div></div>
    <div class="row" style="justify-content:flex-end"><button type="submit" class="btn btn-primary">${icon('factory')}Lanzar orden de montaje</button></div>`;
  const li = $('#m-li'), q = $('#m-q');
  const bomView = () => {
    const bom = BOM[D.lines[+li.value].id]; const qty = Math.max(0, Math.round(+q.value || 0));
    $('#m-bom').innerHTML = `<ul style="margin:4px 0 0;padding-left:1.1em;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px 16px;font-size:.8rem">${Object.entries(bom).map(([cid, n]) => {
      const c = D.components.find((x) => x.id === cid); const need = n * qty; const st = TPS.stockOf(c);
      const short = need > st;
      return `<li title="Lote ${esc(c.lote)}">${fmtN(need)} × ${esc(c.nombre)}${short ? ' ' + statusChip('crit', `faltan ${fmtN(need - st)}`) : ''}</li>`;
    }).join('')}</ul>`;
  };
  li.addEventListener('change', bomView); q.addEventListener('input', bomView); bomView();
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const qty = Number(q.value); const err = $('#m-q-err');
    if (!Number.isInteger(qty) || qty < 10 || qty > 3000) { err.textContent = 'La cantidad debe ser un número entero entre 10 y 3.000 kits.'; err.hidden = false; q.setAttribute('aria-invalid', 'true'); q.focus(); return; }
    const bom = BOM[D.lines[+li.value].id];
    const shortage = Object.entries(bom).filter(([cid, n]) => n * qty > TPS.stockOf(D.components.find((x) => x.id === cid)));
    if (shortage.length) {
      err.textContent = `No hay stock suficiente de: ${shortage.map(([cid]) => D.components.find((x) => x.id === cid).nombre).join(', ')}. Reduce la cantidad o crea una solicitud de compra en el inventario.`;
      err.hidden = false; q.setAttribute('aria-invalid', 'true'); q.focus(); return;
    }
    err.hidden = true; q.removeAttribute('aria-invalid');
    const n = +$('#m-n').value;
    const mo = { id: `OM/26/0930-${String(TPS.mos.length + 7).padStart(3, '0')}`, li: +li.value, n, qty, done: false };
    TPS.mos.unshift(mo);
    Object.entries(bom).forEach(([cid, k]) => { TPS.used[cid] += k * qty; });
    toast(`Orden ${mo.id} lanzada`, `${fmtN(qty)} kits de ${D.lines[mo.li].nombre} en ${D.naves[n].nombre}. Se han reservado los componentes siguiendo FEFO.`, 'factory');
    flashProp(['tps', 'mis']);
    updateTps(); bomView();
    setTimeout(() => { mo.done = true; TPS.prod.extra[n] += qty; updateTps(); toast(`Orden ${mo.id} completada`, `${fmtN(qty)} kits listos para expedir. El informe de producción del MIS ya los incluye.`, 'check'); }, 6000);
  });
}

Bus.on('tx', () => {
  if (S.view === 'tps') {
    updateTps('live');
    const card = document.getElementById('tps-hourly-card'); if (card && card.redraw) card.redraw();
  }
});
Bus.on('filters', () => { if (S.view === 'tps') updateTps(); });
setInterval(() => { if (S.view === 'tps') updateTps(); }, 30000);
