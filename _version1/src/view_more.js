/* ===================================================================== view_more.js
   Comparativa, mapa de Odoo, reflexión ODS, equipo y glosario. */

const SYS = ['tps', 'mis', 'dss', 'ess'];
const CMP_ROWS = [
  ['Pregunta que responde', ['¿Qué está pasando ahora?', '¿Cómo vamos frente al plan?', '¿Qué pasaría si…?', '¿Hacia dónde vamos?']],
  ['Tipo de datos', ['Transacciones detalladas: pedidos, lotes, órdenes de montaje', 'Resúmenes periódicos del TPS, comparados con presupuesto y año anterior', 'Datos del MIS, datos externos y supuestos de quien decide', 'KPIs muy agregados, tendencias y datos externos de mercado y regulación']],
  ['Nivel de decisión', ['Operacional', 'Gerencial (táctico)', 'Decisional (táctico-estratégico)', 'Estratégico']],
  ['Tipo de decisión', ['Estructurada y repetitiva', 'Semiestructurada y recurrente', 'Semiestructurada y puntual', 'No estructurada, de largo plazo']],
  ['Usuarios objetivo', ['Operarios/as, almacén, atención al cliente, administración', 'Jefes/as de producción, logística, compras, ventas y RR. HH.', 'Analistas, COO, CCO, responsables de producto', 'CEO, comité de dirección y consejo']],
  ['Frecuencia', ['Tiempo real', 'Diaria, semanal, mensual', 'Bajo demanda (ad hoc)', 'Mensual y trimestral']],
  ['Formato', ['Formularios, listados, etiquetas y alertas', 'Informes fijos, comparativas y excepciones', 'Simuladores, escenarios y sensibilidad', 'Cuadro de mando con semáforos y drill-down']],
  ['Horizonte temporal', ['Hoy', 'Semanas y meses', 'Meses (de 3 a 36)', 'Años (plan 2027)']],
  ['Ejemplo en Kaidora', ['Registrar un pedido de farmacia con su lote FEFO', 'Detectar que la web vende un 9 % menos de lo presupuestado', 'Decidir si lanzamos el Kit Accesible', 'Reducir la dependencia de Amazon por debajo del 35 %']],
  ['Aporte a la inclusión', ['Recoge en origen la necesidad de formato accesible y la atención asistida', 'Desglosa plantilla y clientes por género, edad y discapacidad', 'Dimensiona productos para colectivos excluidos', 'Fija objetivos ODS 5, 9 y 10 para 2027']],
];
const CMP_DOTS = [
  ['Volumen de datos', [4, 3, 2, 1]],
  ['Grado de agregación', [1, 2, 3, 4]],
  ['Uso de datos externos', [1, 1, 3, 4]],
  ['Flexibilidad e interactividad', [1, 2, 4, 3]],
];
const PERSONAS = [
  { id: 'op', label: 'Operaria de montaje', sys: ['tps'], txt: 'Lanza y cierra órdenes de montaje en la tablet de la línea y consume los lotes que el TPS le indica (FEFO).' },
  { id: 'sac', label: 'Agente de atención al cliente', sys: ['tps'], txt: 'Registra pedidos asistidos por teléfono, anota si el cliente necesita formato accesible y consulta el estado de los envíos.' },
  { id: 'alm', label: 'Jefe de almacén', sys: ['tps', 'mis'], txt: 'Vigila las alertas de stock del TPS y revisa cada semana el informe de OTIF y de proveedores del MIS.' },
  { id: 'mkt', label: 'Responsable de marketplaces', sys: ['mis', 'dss'], txt: 'Compara Amazon con el presupuesto en el MIS y simula precios y comisiones antes de cambiar un PVP.' },
  { id: 'rrhh', label: 'Responsable de personas', sys: ['mis', 'ess'], txt: 'Prepara el registro retributivo y los indicadores del plan de igualdad para el comité de dirección.' },
  { id: 'ana', label: 'Analista de datos', sys: ['mis', 'dss'], txt: 'Mantiene los informes del MIS y construye los modelos del Kit Accesible y de capacidad para Navidad.' },
  { id: 'cfo', label: 'Directora financiera (CFO)', sys: ['dss', 'ess'], txt: 'Valida el VAN de los proyectos en el DSS y sigue el EBITDA y el presupuesto en el ESS.' },
  { id: 'ceo', label: 'Director general (CEO)', sys: ['ess'], txt: 'Revisa el cuadro de mando cada mes con el comité y baja al detalle solo cuando algo se sale del objetivo.' },
];

RENDER.cmp = function () {
  const el = mount('view-cmp', `
    <header><p class="eyebrow">Comprensión de los tipos de sistemas</p><h1 style="margin-top:8px">Comparativa de los 4 sistemas</h1><p class="lead" style="margin-top:10px">Los cuatro trabajan con los mismos datos de Kaidora, pero cada uno existe para un tipo de decisión y de usuario distinto. Pulsa la cabecera de una columna para resaltarla, o elige un perfil para ver qué sistemas usa.</p></header>
    <section class="card stack" style="gap:12px" aria-labelledby="h-persona">
      <h3 id="h-persona">¿Quién eres en Kaidora?</h3>
      <div class="persona-chips" role="group" aria-label="Perfiles de usuario">${PERSONAS.map((p) => `<button type="button" data-persona="${p.id}" aria-pressed="false">${esc(p.label)}</button>`).join('')}</div>
      <p class="ink2" id="persona-txt" aria-live="polite" style="font-size:.92rem">Elige un perfil para ver qué sistemas usa y para qué.</p>
    </section>
    <section class="card" style="padding:0" aria-labelledby="h-matrix">
      <h2 id="h-matrix" class="sr-only">Matriz comparativa</h2>
      <div class="table-wrap" style="border-radius:var(--r)"><table class="cmp" id="cmp-table"><thead><tr><th scope="col"><span class="sr-only">Criterio</span></th>${SYS.map((s, i) => `<th scope="col" data-col="${i}"><button type="button" class="lvl-chip" data-l="${s}" data-colbtn="${i}" style="border:0;cursor:pointer" aria-pressed="false"><b>${s.toUpperCase()}</b>${LEVELS[3 - i].nivel}</button></th>`).join('')}</tr></thead>
      <tbody>${CMP_ROWS.map(([h, vals]) => `<tr><th scope="row">${h}</th>${vals.map((v, i) => `<td data-col="${i}">${esc(v)}</td>`).join('')}</tr>`).join('')}
      ${CMP_DOTS.map(([h, vals]) => `<tr><th scope="row">${h}</th>${vals.map((v, i) => `<td data-col="${i}"><span class="dots" role="img" aria-label="${v} de 4">${[1, 2, 3, 4].map((k) => `<i class="${k <= v ? 'on' : ''}"></i>`).join('')}</span></td>`).join('')}</tr>`).join('')}
      <tr><th scope="row">Abrir panel</th>${SYS.map((s, i) => `<td data-col="${i}"><button type="button" class="btn btn-sm" data-go="${s}">${s.toUpperCase()} ${icon('arrowR')}</button></td>`).join('')}</tr>
      </tbody></table></div>
    </section>
    <section class="card stack" aria-labelledby="h-flowd">
      <div><h3 id="h-flowd">Cómo fluyen los datos en Kaidora</h3><p class="card-sub">Los datos suben agregándose desde el TPS; los datos externos entran en el DSS y en el ESS; las decisiones bajan convertidas en objetivos y reglas.</p></div>
      <div class="table-wrap"><div id="flow-svg" style="min-width:720px"></div></div>
    </section>`);
  const table = $('#cmp-table');
  const highlight = (cols) => {
    $$('[data-col]', table).forEach((c) => { const on = cols.includes(+c.dataset.col); c.classList.toggle('col-on', cols.length > 0 && on); c.classList.toggle('col-off', cols.length > 0 && !on); });
    $$('[data-colbtn]', table).forEach((b) => b.setAttribute('aria-pressed', String(cols.includes(+b.dataset.colbtn))));
  };
  let sel = [];
  $$('[data-colbtn]', table).forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.colbtn; sel = sel.length === 1 && sel[0] === i ? [] : [i]; highlight(sel);
    $$('[data-persona]').forEach((x) => x.setAttribute('aria-pressed', 'false')); $('#persona-txt').textContent = 'Elige un perfil para ver qué sistemas usa y para qué.';
  }));
  $$('[data-persona]', el).forEach((b) => b.addEventListener('click', () => {
    const p = PERSONAS.find((x) => x.id === b.dataset.persona); const was = b.getAttribute('aria-pressed') === 'true';
    $$('[data-persona]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    if (was) { highlight([]); $('#persona-txt').textContent = 'Elige un perfil para ver qué sistemas usa y para qué.'; return; }
    b.setAttribute('aria-pressed', 'true');
    sel = p.sys.map((s) => SYS.indexOf(s)); highlight(sel);
    $('#persona-txt').innerHTML = `<b>${esc(p.label)}</b> usa ${p.sys.map((s) => `<b>${s.toUpperCase()}</b>`).join(' y ')}. ${esc(p.txt)}`;
  }));
  $('#flow-svg').innerHTML = flowSvg();
};
function flowSvg() {
  const box = (x, y, w, h, l, t1, t2) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" style="fill:var(--lvl-${l})"/>
    <text x="${x + 14}" y="${y + 28}" style="fill:var(--lvl-${l}-ink);font-family:var(--font-display);font-weight:800;font-size:20px">${l.toUpperCase()}</text>
    <text x="${x + 14}" y="${y + 50}" style="fill:var(--lvl-${l}-ink);font-size:12.5px;font-weight:700">${t1}</text>
    <text x="${x + 14}" y="${y + 68}" style="fill:var(--lvl-${l}-ink);font-size:12px">${t2}</text></g>`;
  const arrow = (d, label, lx, ly, dashed) => `<path d="${d}" style="fill:none;stroke:var(--ink-2);stroke-width:1.6;${dashed ? 'stroke-dasharray:5 4;' : ''}" marker-end="url(#ah)"/>${label ? `<text x="${lx}" y="${ly}" style="fill:var(--ink-2);font-size:11.5px;font-weight:600">${label}</text>` : ''}`;
  return `<svg viewBox="0 0 960 330" width="100%" role="img" aria-label="Diagrama de flujo de datos: el TPS alimenta al MIS con transacciones; el MIS alimenta al DSS y al ESS con resúmenes; los datos externos entran en el DSS y el ESS; las decisiones de la dirección vuelven al TPS como objetivos y reglas.">
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" style="fill:var(--ink-2)"/></marker></defs>
    <g style="font-family:var(--font-body)">
    <rect x="16" y="120" width="170" height="92" rx="12" style="fill:var(--surface-2);stroke:var(--line-2)"/>
    <text x="30" y="148" style="fill:var(--ink);font-weight:800;font-size:14px">Operación diaria</text>
    <text x="30" y="170" style="fill:var(--ink-2);font-size:12px">Amazon · web · B2B</text>
    <text x="30" y="188" style="fill:var(--ink-2);font-size:12px">farmacias · naves · compras</text>
    ${box(236, 120, 170, 92, 'tps', 'Registra cada transacción', '≈ 1.000 pedidos al día')}
    ${box(456, 120, 170, 92, 'mis', 'Resume y compara', 'Informes mensuales')}
    ${box(700, 24, 190, 92, 'dss', 'Simula alternativas', 'VAN, capacidad, sensibilidad')}
    ${box(700, 214, 190, 92, 'ess', 'Orienta la estrategia', 'CMI, mercado y objetivos 2027')}
    <rect x="456" y="16" width="170" height="64" rx="12" style="fill:var(--surface);stroke:var(--line-2);stroke-dasharray:4 3"/>
    <text x="470" y="42" style="fill:var(--ink);font-weight:800;font-size:13px">Datos externos</text>
    <text x="470" y="62" style="fill:var(--ink-2);font-size:12px">INE, mercado, regulación</text>
    ${arrow('M186,166H232', 'pedidos', 190, 158)}
    ${arrow('M406,166H452', 'agrega', 408, 158)}
    ${arrow('M626,150C660,150 660,70 696,70', 'resúmenes', 632, 110)}
    ${arrow('M626,182C660,182 660,260 696,260', 'KPIs', 640, 232)}
    ${arrow('M626,48C660,48 670,48 696,48', '', 0, 0)}
    ${arrow('M795,116V210', 'propuestas', 802, 168)}
    ${arrow('M600,16V8H926V262H894', '', 0, 0)}
    ${arrow('M700,296C520,330 330,320 320,216', 'objetivos, reglas y decisiones', 430, 300, true)}
    </g></svg>`;
}

/* ---------------------------------------------------------------- Odoo */
const ODOO = [
  { l: 'tps', mods: [
    ['cart', 'Ventas', 'Pedidos B2B y de farmacias, presupuestos y tarifas por canal (referencias S0xxxxx).'],
    ['globe', 'Comercio electrónico', 'Tienda kaidora.es con el campo «formato accesible» en el checkout.'],
    ['refresh', 'Conector de Amazon (Enterprise)', 'Sincroniza pedidos, stock FBA y devoluciones con Seller Central.'],
    ['box', 'Inventario', 'Lotes y fechas de caducidad con estrategia de retirada FEFO y reglas de reabastecimiento.'],
    ['factory', 'Fabricación', 'Listas de materiales por kit y órdenes de montaje que consumen componentes.'],
    ['truck', 'Compras', 'Solicitudes de presupuesto y pedidos a los 12 proveedores.'],
    ['shield', 'Calidad (Enterprise)', 'Puntos de control en la línea: contenido completo, lote y caducidad.'],
  ] },
  { l: 'mis', mods: [
    ['chart', 'Informes de cada app', 'Vistas de tabla dinámica y gráficos de Ventas, Inventario y Fabricación por mes, canal y línea.'],
    ['table', 'Hojas de cálculo (Enterprise)', 'Informes mensuales enlazados a los datos en vivo, frente a presupuesto.'],
    ['users', 'Empleados y Nómina', 'Registro retributivo por sexo, jornada y complementos; formación por edad.'],
  ] },
  { l: 'dss', mods: [
    ['sliders', 'Hojas de cálculo con escenarios', 'Modelos «qué pasaría si» del Kit Accesible alimentados con datos del MIS.'],
    ['clock', 'Programa maestro de producción (Enterprise)', 'Previsión de demanda del Q4 frente a la capacidad de cada nave.'],
    ['person', 'Planificación (Enterprise)', 'Turnos y refuerzos temporales para la campaña de Navidad.'],
  ] },
  { l: 'ess', mods: [
    ['target', 'Tableros', 'Cuadro de mando integral del comité con KPIs, objetivos y alertas.'],
    ['file', 'Documentos y Conocimiento', 'Plan estratégico 2027, plan de igualdad y actas del comité.'],
  ] },
];
const ODOO_FIELDS = [
  ['Pedido de venta', 'Formato accesible solicitado', 'Selección: ninguno, letra grande, braille, lectura fácil', 'Ventas y almacén', 'Preparar bien el pedido y medir la demanda (señal para el DSS).'],
  ['Pedido de venta', 'Atención asistida', 'Sí / no', 'Atención al cliente', 'Medir la brecha digital y dimensionar el servicio telefónico.'],
  ['Contacto', 'Rango de edad', 'Selección opcional con «prefiero no indicarlo»', 'Solo informes agregados', 'Detectar grupos que no llegan a la web.'],
  ['Empleado', 'Género', 'Mujer, hombre, otro (ya existe en Odoo)', 'RR. HH.', 'Registro retributivo y plan de igualdad sin forzar una respuesta binaria.'],
  ['Empleado', 'Discapacidad reconocida', 'Sí / no, grupo de acceso restringido', 'Solo RR. HH.', 'Cuota legal y ajustes razonables; dato de salud protegido.'],
  ['Empleado', 'Adaptación del puesto', 'Texto', 'RR. HH. y prevención', 'Que la adaptación siga a la persona si cambia de puesto.'],
];
RENDER.odoo = function () {
  mount('view-odoo', `
    <header><p class="eyebrow">Base para el proyecto de la asignatura</p><h1 style="margin-top:8px">Mapa de módulos de Odoo</h1><p class="lead" style="margin-top:10px">Así implantaríamos los cuatro sistemas de Kaidora en Odoo. Algunas aplicaciones solo están en la edición Enterprise; lo indicamos para planificar el proyecto.</p></header>
    <div class="grid g2">${ODOO.map((g) => `<section class="card" aria-labelledby="h-od-${g.l}"><div class="card-head"><h2 id="h-od-${g.l}" style="font-size:1.1rem;font-family:var(--font-body)"><span class="lvl-chip" data-l="${g.l}"><b>${g.l.toUpperCase()}</b>${LEVELS[3 - SYS.indexOf(g.l)].nivel}</span></h2></div>
      ${g.mods.map(([ic, n, d]) => `<div class="mod"><span class="mod-ic">${icon(ic)}</span><div><b>${esc(n)}</b><p>${esc(d)}</p></div></div>`).join('')}</section>`).join('')}</div>
    <section class="card" aria-labelledby="h-fields">
      <div class="card-head"><div><h3 id="h-fields">Campos que añadiremos para que el sistema no invisibilice a nadie</h3><p class="card-sub">Se crean con Odoo Studio o como módulo propio. Recogemos la necesidad, nunca el diagnóstico.</p></div><span class="ods-badge ods-10"><i>10</i></span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Registro</th><th scope="col">Campo</th><th scope="col">Tipo</th><th scope="col">Quién lo ve</th><th scope="col">Para qué</th></tr></thead>
      <tbody>${ODOO_FIELDS.map((r) => `<tr>${r.map((c, i) => `<td${i === 1 ? ' style="font-weight:700"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </section>
    <section class="card stack" aria-labelledby="h-road">
      <h3 id="h-road">Hoja de ruta de implantación propuesta</h3>
      <div class="grid g4">
        ${[['tps', 'Oct.–dic. 2026', 'Ventas, Inventario con lotes, Fabricación, Compras y conector de Amazon. Migración del catálogo y de las listas de materiales.'], ['mis', 'Ene.–feb. 2027', 'Informes por canal y línea, presupuesto 2027, registro retributivo y formación.'], ['dss', 'Mar. 2027', 'Hojas de cálculo de escenarios y programa maestro de producción.'], ['ess', 'Abr. 2027', 'Tablero del comité con objetivos ODS y alertas.']].map(([l, when, what], i) => `<div class="phase"><span class="n lvl-chip" data-l="${l}" style="padding:0;justify-content:center;width:30px;height:30px">${i + 1}</span><div><b>${when}</b><p class="ink2" style="font-size:.86rem">${what}</p></div></div>`).join('')}
      </div>
    </section>`);
};

/* ---------------------------------------------------------------- ODS: reflexión */
const DATA_RULES = [
  ['tps', 'Formato accesible solicitado', 'Campo opcional en el checkout y en el pedido telefónico', 'Preparar el pedido y medir la demanda', 'No se pregunta por la discapacidad, solo por la necesidad'],
  ['tps', 'Atención asistida por teléfono', 'Lo marca el agente al registrar el pedido', 'Medir la brecha digital', 'Sin datos personales adicionales'],
  ['tps', 'Rango de edad del cliente', 'Opcional, por tramos, con consentimiento', 'Detectar a quién no llega la web', '«Prefiero no indicarlo» por defecto; uso agregado'],
  ['mis', 'Género (incluida opción no binaria), jornada, complementos, promociones', 'Ficha de empleado y nómina', 'Registro retributivo y plan de igualdad', 'Acceso restringido; grupos de 5 o más personas'],
  ['mis', 'Discapacidad reconocida y adaptaciones de puesto', 'Declaración voluntaria al equipo de personas', 'Cuota legal y ajustes razonables', 'Dato de salud (art. 9 RGPD): solo agregado'],
  ['mis', 'Horas de formación por tramo de edad', 'Registro de formación', 'Evitar la brecha digital interna', '—'],
  ['dss', 'Población con discapacidad y mayor de 65 años', 'Fuentes públicas (INE)', 'Dimensionar el Kit Accesible', 'Citar la fuente y el año'],
  ['ess', 'Indicadores ODS con objetivo 2027', 'Consolidación trimestral desde el MIS', 'Compromiso de la dirección', 'Publicar cómo se calcula cada indicador'],
];
function reflectionHtml() {
  const form55 = mean(EMP.filter((e) => e.edad >= 55).map((e) => e.formacion)) / mean(EMP.map((e) => e.formacion));
  const pt = EMP.filter((e) => e.jornada === 'Parcial'); const ptW = pt.filter((e) => e.genero === 'M').length / pt.length;
  const acc = D.customers.accesible; const npsAll = sum(D.customers.nps.map((n, i) => n * D.customers.compradores[i]));
  return `
    <h2 style="font-size:1.6rem">Lo que el sistema no registra, la empresa no lo ve</h2>
    <h3>La inclusión empieza en el TPS</h3>
    <p>Al construir los cuatro paneles de Kaidora aprendimos que la inclusión no es una capa que se añade al final, en el cuadro de mando de la dirección. Empieza en el formulario más sencillo del sistema de transacciones (TPS). El ESS solo puede mostrar la brecha salarial si el MIS agrega los salarios por género, y el MIS solo puede hacerlo si la nómina registra ese dato de forma fiable.</p>
    <p>Con la accesibilidad ocurre lo mismo. El Kit Accesible que evaluamos en el DSS nació de un campo opcional que añadimos al checkout en enero de 2026 («¿necesitas las instrucciones en un formato accesible?»). En septiembre ese campo ya sumaba ${fmtN(acc[acc.length - 1][1])} peticiones. Sin él, esa demanda seguiría siendo invisible para la empresa.</p>
    <h3>¿Puede el sistema reducir la brecha de género?</h3>
    <p>Por sí solo, no; pero sin él la brecha ni siquiera se ve. En Kaidora las mujeres son el ${fmtPct(HR.women / HR.total, 0)} de la plantilla y solo el ${fmtPct(HR.leadersW / HR.leaders.length, 0)} de los puestos de mando. La brecha salarial media a jornada completa es del ${fmtPct(HR.gap)}, pero a igual puesto baja al ${fmtPct(HR.gapAdj)}.</p>
    <p>Ese desglose cambia la política. La brecha se explica sobre todo por la segregación vertical y por la parcialidad, que en un ${fmtPct(ptW, 0)} es femenina. No basta con revisar las tablas salariales: hay que actuar sobre las promociones y la conciliación. Para eso el sistema debe registrar, además del sexo, la jornada, los complementos, las promociones y las solicitudes de conciliación, como exige el registro retributivo (RD 902/2020).</p>
    <p>También aprendimos que el campo «género» no debe ser binario. Dos personas de la plantilla no se identifican como mujer u hombre, y el sistema debe permitirlo sin exponerlas. Por eso ningún informe que cruce datos sensibles muestra grupos de menos de cinco personas.</p>
    <h3>¿Puede dar visibilidad a colectivos excluidos?</h3>
    <p>Sí, si decidimos medirlos. El MIS nos mostró que las personas de 65 años o más son el 26 % de la población adulta, pero solo el 8 % de nuestros compradores web. Además son las menos satisfechas (NPS ${D.customers.nps[5]}). Sin ese desglose por edad habríamos celebrado un NPS medio de ${dec(npsAll, 0)} sin ver a quién dejamos fuera.</p>
    <p>Con la discapacidad ocurre algo parecido. Cumplimos la cuota legal del 2 % (${HR.disc} personas, un ${fmtPct(HR.disc / HR.total)}), pero el porcentaje dice poco. Los datos útiles son las adaptaciones de puesto y la formación: las personas de más de 55 años reciben un ${fmtPct(1 - form55, 0)} menos de horas que la media, un riesgo claro de brecha digital interna.</p>
    <h3>Qué datos recoger y cómo</h3>
    <p>Identificar el dato no basta; importa cómo se recoge. Proponemos cuatro reglas:</p>
    <ol style="margin:0;padding-left:1.3em;display:grid;gap:6px;color:var(--ink-2);line-height:1.6">
      <li><b>Voluntariedad y consentimiento explícito</b>, siempre con la opción «prefiero no indicarlo».</li>
      <li><b>Minimización</b>: pedimos la necesidad (un formato accesible), nunca el diagnóstico, porque la salud y la discapacidad son datos de categoría especial (art. 9 del RGPD).</li>
      <li><b>Agregación y umbrales</b> para no reidentificar a nadie en los informes.</li>
      <li><b>Un sistema accesible en sí mismo</b>: contraste, teclado y lectura fácil. Un dashboard que excluye a sus usuarios contradice lo que mide; por eso esta aplicación incluye esas funciones.</li>
    </ol>
    <h3>Conclusión</h3>
    <p>Cada nivel cumple un papel distinto: el TPS decide qué existe, el MIS lo hace visible, el DSS convierte esa visibilidad en decisiones evaluables y el ESS la transforma en compromiso estratégico, con objetivos para 2027.</p>
    <p>El riesgo es quedarse en la métrica: cumplir la cuota o mejorar un indicador sin cambiar la realidad. Para evitarlo, vinculamos cada indicador ODS a una decisión concreta: el Kit Accesible, la formación digital para mayores de 55 años y un plan de promoción interna. Un sistema de información inclusivo no es el que tiene más datos, sino el que no deja a nadie fuera de ellos.</p>
    <p class="sig">Daniela Navarro, Ainhoa Rodríguez y Yaiza de Pablo · Sistemas de Información para la Gestión · Universidad Europea</p>`;
}
RENDER.ods = function () {
  mount('view-ods', `
    <header><p class="eyebrow">Enfoque inclusivo</p><h1 style="margin-top:8px">ODS 5, 9 y 10 en los sistemas de Kaidora</h1>
      <div class="row" style="margin-top:12px"><span class="ods-badge ods-5"><i>5</i>Igualdad de género</span><span class="ods-badge ods-10"><i>10</i>Reducción de las desigualdades</span><span class="ods-badge ods-9"><i>9</i>Industria, innovación e infraestructura</span></div></header>
    <div class="grid g-7-5">
      <article class="card reflex" aria-label="Reflexión del grupo" id="ods-reflex">${reflectionHtml()}</article>
      <div class="stack">
        <section class="card stack" style="gap:10px" aria-labelledby="h-where"><h3 id="h-where">Dónde está cada indicador en la aplicación</h3>
          <ul style="margin:0;padding-left:1.1em;display:grid;gap:8px;font-size:.9rem;color:var(--ink-2)">
            <li><a href="#tps" data-go="tps" data-go-opts='{"scrollTo":"tps-forms"}'>TPS</a>: campos opcionales de inclusión en el formulario de pedido.</li>
            <li><a href="#mis" data-go="mis" data-go-opts='{"tab":"personas","scrollTo":"mis-glass"}'>MIS · Personas</a>: techo de cristal, brecha salarial, pirámide de edad, formación y discapacidad.</li>
            <li><a href="#mis" data-go="mis" data-go-opts='{"tab":"clientes","scrollTo":"mis-age"}'>MIS · Clientes</a>: brecha digital por edad, NPS, atención asistida y accesibilidad web.</li>
            <li><a href="#dss" data-go="dss" data-go-opts='{"tab":"kit"}'>DSS</a>: lanzamiento del Kit Accesible e impacto social.</li>
            <li><a href="#ess" data-go="ess" data-go-opts='{"scrollTo":"ess-ods"}'>ESS</a>: objetivos ODS 2027 y alertas.</li>
          </ul></section>
        <section class="card stack" style="gap:10px" aria-labelledby="h-a11y-app"><h3 id="h-a11y-app">Esta aplicación también es accesible</h3>
          <ul style="margin:0;padding-left:1.1em;display:grid;gap:6px;font-size:.9rem;color:var(--ink-2)">
            <li>Tipografía Atkinson Hyperlegible, diseñada por el Braille Institute para personas con baja visión.</li>
            <li>Modo oscuro y de alto contraste, y texto ampliable hasta el 150 %.</li>
            <li>Paleta validada para daltonismo y texturas opcionales en los gráficos.</li>
            <li>Todo se maneja con teclado; cada gráfico tiene tabla alternativa y resumen en lectura fácil.</li>
          </ul>
          <button type="button" class="btn" id="ods-a11y-open">${icon('a11y')}Abrir opciones de accesibilidad</button></section>
      </div>
    </div>
    <section class="card" aria-labelledby="h-rules">
      <div class="card-head"><div><h3 id="h-rules">Qué datos recoger, y cómo, para no invisibilizar a nadie</h3><p class="card-sub">Uno o varios datos por sistema, con la forma de recogerlos y la salvaguarda que aplicamos</p></div></div>
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Sistema</th><th scope="col">Dato</th><th scope="col">Cómo se recoge</th><th scope="col">Para qué</th><th scope="col">Salvaguarda</th></tr></thead>
      <tbody>${DATA_RULES.map((r) => `<tr><td><span class="lvl-chip" data-l="${r[0]}"><b>${r[0].toUpperCase()}</b></span></td><td style="font-weight:700">${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody></table></div>
    </section>`);
  $('#ods-a11y-open').addEventListener('click', () => toggleA11y(true));
};

/* ---------------------------------------------------------------- equipo */
const TEAM = [
  { n: 'Daniela Navarro', ini: 'DN', color: '#2a78d6', rol: 'TPS y MIS', tasks: ['Panel TPS: formularios, registro en vivo e inventario FEFO', 'Informes del MIS de ventas y operaciones', 'Informe de excepciones y drill-down'], talk: 'Introducción, TPS y MIS' },
  { n: 'Ainhoa Rodríguez', ini: 'AR', color: '#4a3aa7', rol: 'DSS y Odoo', tasks: ['Modelo de lanzamiento del Kit Accesible y análisis de sensibilidad', 'Modelo de capacidad para el Q4', 'Mapa de módulos de Odoo y campos inclusivos', 'Comparativa de los 4 sistemas'], talk: 'DSS, Odoo y comparativa' },
  { n: 'Yaiza de Pablo', ini: 'YP', color: '#0b7a4b', rol: 'ESS, ODS y reflexión', tasks: ['Cuadro de mando integral y alertas estratégicas', 'Indicadores ODS 5, 9 y 10', 'Reflexión escrita, glosario y bibliografía'], talk: 'ESS, enfoque inclusivo y cierre' },
];
const RACI = [
  ['Definición de Kaidora y modelo de datos', 'R', 'R', 'A'], ['Panel TPS', 'A', 'C', 'I'], ['Panel MIS', 'A', 'C', 'C'], ['Panel DSS', 'C', 'A', 'I'], ['Panel ESS', 'I', 'C', 'A'],
  ['Comparativa y pirámide', 'R', 'A', 'R'], ['Mapa de Odoo', 'C', 'A', 'I'], ['Reflexión ODS', 'C', 'C', 'A'], ['Presentación y guion', 'A', 'R', 'R'],
];
const DAYS = ['Mié 30/9', 'Jue 1/10', 'Vie 2/10', 'Sáb 3/10', 'Dom 4/10', 'Lun 5/10', 'Mar 6/10', 'Mié 7/10'];
const GANTT = [['Empresa y datos simulados', 'all', 0, 1], ['Panel TPS', 0, 1, 3], ['Panel MIS', 0, 2, 4], ['Panel DSS', 1, 1, 4], ['Mapa de Odoo y comparativa', 1, 4, 5], ['Panel ESS', 2, 2, 4], ['Reflexión ODS', 2, 3, 5], ['Revisión cruzada', 'all', 5, 6], ['Ensayo y entrega', 'all', 6, 7]];
RENDER.team = function () {
  mount('view-team', `
    <header><p class="eyebrow">Trabajo en equipo y reparto equitativo</p><h1 style="margin-top:8px">Equipo y plan de trabajo</h1><p class="lead" style="margin-top:10px">Cada integrante lidera una parte del trabajo y revisa la de las demás. Cada una responde de tres entregables y expone unos 2 minutos y 15 segundos en la presentación.</p></header>
    <div class="grid g3">${TEAM.map((m) => `<section class="card member" aria-labelledby="h-${m.ini}"><div class="row"><span class="avatar" style="background:${m.color}" aria-hidden="true">${m.ini}</span><div><h3 id="h-${m.ini}">${m.n}</h3><span class="muted" style="font-size:.86rem">Responsable de ${m.rol}</span></div></div>
      <ul style="margin:0;padding-left:1.1em;display:grid;gap:4px;font-size:.9rem;color:var(--ink-2)">${m.tasks.map((t) => `<li>${t}</li>`).join('')}</ul>
      <span class="tag">${icon('play')}Presenta: ${m.talk}</span></section>`).join('')}</div>
    <div class="grid g-5-7">
      <section class="card" aria-labelledby="h-raci"><div class="card-head"><div><h3 id="h-raci">Matriz RACI</h3><p class="card-sub">R: realiza · A: responde del resultado · C: se le consulta · I: se le informa</p></div></div>
        <div class="table-wrap"><table class="t raci"><thead><tr><th scope="col">Entregable</th>${TEAM.map((m) => `<th scope="col" class="r" style="text-align:center">${m.ini}</th>`).join('')}</tr></thead>
        <tbody>${RACI.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((c) => `<td class="c">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="muted" style="font-size:.82rem;margin-top:8px">Cada persona responde (A) de tres entregables.</p></section>
      <section class="card" aria-labelledby="h-gantt"><div class="card-head"><div><h3 id="h-gantt">Cronograma</h3><p class="card-sub">Del 30 de septiembre a la entrega del 7 de octubre de 2026</p></div></div>
        <div class="table-wrap"><div class="gantt" role="table" aria-label="Cronograma de tareas">
          <div class="gh" role="columnheader" style="text-align:left">Tarea</div>${DAYS.map((d) => `<div class="gh" role="columnheader">${d}</div>`).join('')}
          ${GANTT.map(([t, who, a, b]) => `<div class="gt" role="rowheader">${t}<br><span class="muted" style="font-size:.74rem;font-weight:500">${who === 'all' ? 'Todo el equipo' : TEAM[who].n}</span></div>${DAYS.map((_, i) => `<div role="cell">${i >= a && i <= b ? `<div class="bar" style="background:${who === 'all' ? 'var(--ink-2)' : TEAM[who].color}" title="${esc(t)}"></div>` : ''}</div>`).join('')}`).join('')}
        </div></div></section>
    </div>
    <section class="card stack" style="gap:10px" aria-labelledby="h-method"><h3 id="h-method">Metodología y herramientas</h3>
      <p class="ink2" style="font-size:.92rem">Usamos <b>Claude (Anthropic)</b> como herramienta de trabajo indicada para la actividad, sin Looker Studio ni Mockaroo. Con Claude generamos los datos con un script propio de Python (<span class="mono">generar_datos.py</span>, semilla fija 2026), desarrollamos esta aplicación web y redactamos borradores. Las decisiones sobre la empresa, los indicadores y la reflexión son del equipo.</p>
      <div class="kpis">
        ${kpiHtml({ label: 'Meses de histórico', value: String(NM), foot: 'enero 2024 – septiembre 2026' })}
        ${kpiHtml({ label: 'Filas de ventas', value: fmtN(D.facts.length), foot: 'mes × canal × línea × país' })}
        ${kpiHtml({ label: 'Personas', value: fmtN(D.employees.length), foot: 'registros seudonimizados' })}
        ${kpiHtml({ label: 'Proveedores y componentes', value: `${D.suppliers.length} · ${D.components.length}`, foot: 'con lotes y caducidades' })}
      </div></section>`);
};

/* ---------------------------------------------------------------- glosario y bibliografía */
const GLOSS = [
  ['TPS', 'Sistema de procesamiento de transacciones. Registra las operaciones diarias (pedidos, cobros, movimientos de stock) de forma fiable y en tiempo real.'],
  ['MIS', 'Sistema de información gerencial. Resume los datos del TPS en informes periódicos para que los mandos controlen el plan.'],
  ['DSS', 'Sistema de apoyo a la decisión. Combina datos, modelos y supuestos para analizar decisiones semiestructuradas («¿qué pasaría si…?»).'],
  ['ESS', 'Sistema de información para ejecutivos. Presenta a la alta dirección pocos indicadores clave, tendencias y datos externos.'],
  ['ERP', 'Software que integra en una sola base de datos los procesos de la empresa: ventas, compras, inventario, producción, finanzas y RR. HH. Odoo es un ERP.'],
  ['KPI', 'Indicador clave de rendimiento: una medida que dice si se cumple un objetivo.'],
  ['Cuadro de mando integral', 'Método de Kaplan y Norton que equilibra indicadores financieros, de clientes, de procesos y de aprendizaje y personas.'],
  ['Drill-down', 'Bajar de un dato agregado a su detalle; por ejemplo, del KPI del ESS al informe del MIS y a las transacciones del TPS.'],
  ['VAN', 'Valor actual neto: suma de los flujos de caja futuros descontados menos la inversión. Si es positivo, el proyecto crea valor.'],
  ['Punto de equilibrio', 'Número de unidades que hay que vender para cubrir los costes fijos.'],
  ['Análisis de sensibilidad', 'Estudio de cuánto cambia un resultado cuando varía cada supuesto. Indica qué variable conviene validar primero.'],
  ['OEE', 'Eficiencia general de los equipos: disponibilidad × rendimiento × calidad. Una línea de clase mundial ronda el 85 %.'],
  ['OTIF', 'On Time In Full: porcentaje de entregas que llegan a tiempo y completas.'],
  ['FEFO', 'First Expired, First Out: sale primero el lote que caduca antes. Es clave en productos sanitarios.'],
  ['Lote y trazabilidad', 'Identificar cada lote de componente para saber en qué kits está y poder retirarlo si hace falta.'],
  ['Fedicom', 'Estándar de comunicación de pedidos entre farmacias y distribuidores farmacéuticos en España.'],
  ['Brecha salarial', 'Diferencia entre el salario medio de hombres y mujeres. La bruta compara medias generales; la ajustada compara a igual puesto.'],
  ['Techo de cristal', 'Barrera invisible que limita el acceso de las mujeres a los puestos de dirección.'],
  ['Centro Especial de Empleo', 'Empresa cuya plantilla está formada mayoritariamente por personas con discapacidad. Comprarle es una medida alternativa de inclusión.'],
  ['Lectura fácil', 'Método para redactar textos comprensibles para todas las personas (norma UNE 153101 EX).'],
  ['WCAG', 'Pautas de accesibilidad para el contenido web del W3C. La versión 2.2 es de 2023.'],
  ['Ley 11/2023', 'Traspone la Directiva europea de accesibilidad: desde el 28/06/2025 el comercio electrónico debe ser accesible.'],
  ['Categoría especial de datos', 'Datos de salud, origen étnico, orientación sexual, etc. (art. 9 del RGPD). Solo se tratan con garantías reforzadas.'],
  ['Umbral mínimo de publicación', 'Regla de no mostrar grupos de menos de 5 personas para evitar identificar a nadie (principio de k-anonimidad).'],
];
const REFS = [
  'Laudon, K. C., y Laudon, J. P. (2016). <i>Sistemas de información gerencial</i> (14.ª ed.). Pearson Educación.',
  'Kaplan, R. S., y Norton, D. P. (1996). <i>The balanced scorecard: Translating strategy into action</i>. Harvard Business School Press.',
  'Naciones Unidas. (2015). <i>Transformar nuestro mundo: la Agenda 2030 para el Desarrollo Sostenible</i> (A/RES/70/1).',
  'Instituto Nacional de Estadística. (2022). <i>Encuesta de Discapacidad, Autonomía personal y situaciones de Dependencia (EDAD 2020)</i>. INE.',
  'Soriguer, F., Goday, A., Bosch-Comas, A., et al. (2012). Prevalence of diabetes mellitus and impaired glucose regulation in Spain: the Di@bet.es Study. <i>Diabetologia, 55</i>(1), 88–93.',
  'Real Decreto 901/2020, de 13 de octubre, por el que se regulan los planes de igualdad y su registro. <i>Boletín Oficial del Estado</i>, 272.',
  'Real Decreto 902/2020, de 13 de octubre, de igualdad retributiva entre mujeres y hombres. <i>Boletín Oficial del Estado</i>, 272.',
  'Real Decreto Legislativo 1/2013, de 29 de noviembre, por el que se aprueba el Texto Refundido de la Ley General de derechos de las personas con discapacidad y de su inclusión social. <i>Boletín Oficial del Estado</i>, 289.',
  'Ley 11/2023, de 8 de mayo, de trasposición de Directivas de la Unión Europea en materia de accesibilidad de determinados productos y servicios. <i>Boletín Oficial del Estado</i>, 110.',
  'Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016 (Reglamento general de protección de datos). <i>Diario Oficial de la Unión Europea</i>, L 119.',
  'Reglamento (UE) 2017/745 del Parlamento Europeo y del Consejo, de 5 de abril de 2017, sobre los productos sanitarios. <i>Diario Oficial de la Unión Europea</i>, L 117.',
  'Real Decreto 486/1997, de 14 de abril, por el que se establecen las disposiciones mínimas de seguridad y salud en los lugares de trabajo. <i>Boletín Oficial del Estado</i>, 97.',
  'W3C. (2023). <i>Web Content Accessibility Guidelines (WCAG) 2.2</i>. World Wide Web Consortium.',
  'AENOR. (2018). <i>UNE 153101:2018 EX. Lectura fácil: pautas y recomendaciones para la elaboración de documentos</i>.',
  'Odoo S.A. (2025). <i>Documentación de Odoo 18</i>. https://www.odoo.com/documentation/18.0/',
];
RENDER.gloss = function () {
  mount('view-gloss', `
    <header><p class="eyebrow">Conceptos y fuentes</p><h1 style="margin-top:8px">Glosario y bibliografía</h1></header>
    <div class="field" style="max-width:420px"><label for="g-q">Buscar un término</label><input class="input" id="g-q" type="search" placeholder="Por ejemplo: OEE, brecha, FEFO" autocomplete="off"></div>
    <dl class="gloss" id="g-list"></dl>
    <p class="muted" id="g-empty" hidden>No hay ningún término que coincida. Prueba con otra palabra.</p>
    <section class="card stack" aria-labelledby="h-refs"><h2 id="h-refs" style="font-size:1.3rem">Bibliografía (APA 7)</h2><ul class="refs">${REFS.map((r) => `<li>${r}</li>`).join('')}</ul>
    <p class="muted" style="font-size:.84rem">Todos los datos de Kaidora son simulados con fines académicos. Las cifras externas (INE y Di@bet.es) se usan como contexto y se citan arriba.</p></section>`);
  const draw = (q = '') => {
    const n = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const items = GLOSS.filter(([t, d]) => !n || (t + ' ' + d).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(n));
    $('#g-list').innerHTML = items.map(([t, d]) => `<div class="gterm"><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
    $('#g-empty').hidden = items.length > 0;
  };
  $('#g-q').addEventListener('input', (e) => draw(e.target.value));
  draw();
};
