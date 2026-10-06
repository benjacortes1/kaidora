/* ===================================================================== tour.js
   Recorrido guiado = guion de la presentación en clase (≈ 7 minutos).
   Cada paso indica quién habla, qué decir y qué hacer en pantalla. */

const PRESENTERS = [
  { n: 'Daniela Navarro', ini: 'DN', color: '#2a78d6' },
  { n: 'Ainhoa Rodríguez', ini: 'AR', color: '#4a3aa7' },
  { n: 'Yaiza de Pablo', ini: 'YP', color: '#0b7a4b' },
];
const TOUR = [
  { view: 'home', target: '.pyr-wrap', who: 0, sec: 30, t: 'Kaidora y la pirámide de sistemas', txt: 'Presentamos Kaidora: kits de primeros auxilios, 150 personas, dos naves en Valencia y cinco canales de venta. La pirámide ordena sus cuatro sistemas según el nivel de decisión: cuanto más arriba, datos más agregados y decisiones menos estructuradas.' },
  { view: 'tps', target: '#view-tps .ficha', who: 0, sec: 15, t: 'TPS: la base de todo', txt: 'La ficha resume lo que pide la actividad: tipo de datos, nivel, usuarios, frecuencia y formato, y ejemplos reales del sector, como Fedicom para las farmacias o la trazabilidad por lote.' },
  { view: 'tps', target: '#tps-log-card', who: 0, sec: 15, t: 'Transacciones en tiempo real', txt: 'Cada pocos segundos entra un pedido (simulación acelerada). El TPS responde a «¿qué está pasando ahora?»: estados, importes, países y los campos de inclusión.' },
  { view: 'tps', target: '#tps-forms', who: 0, sec: 20, t: 'Demostración: registramos un pedido', txt: 'Registrad un pedido web marcando «Lectura fácil» y el consentimiento. El aviso muestra cómo ese dato llega al MIS, al DSS y al ESS. Opcional: lanzad una orden de montaje y veréis cómo baja el stock.' },
  { view: 'tps', target: '#tps-stock', who: 0, sec: 10, t: 'Inventario con FEFO', txt: 'Decisiones estructuradas: qué lote sale primero y cuándo pedir. El estuche EVA está en nivel crítico: con un clic se genera la solicitud de compra.' },
  { view: 'mis', tab: 'ventas', target: '#mis-trend', who: 0, sec: 25, t: 'MIS: cómo vamos frente al plan', txt: 'El MIS resume miles de transacciones en informes mensuales frente al presupuesto. Pulsad un mes: se abre la muestra de transacciones del TPS de las que sale ese total (drill-down).' },
  { view: 'mis', tab: 'ventas', target: '#mis-exc', who: 0, sec: 20, t: 'Informe de excepciones', txt: 'El jefe de área no quiere ver todo, solo lo que se desvía: la web por debajo del presupuesto por el cambio de pasarela de pago y la rotura de stock de la línea Diabetes.' },
  { view: 'dss', tab: 'kit', target: '#dss-kit-inputs', who: 1, sec: 35, t: 'DSS: ¿lanzamos el Kit Accesible?', txt: `Una decisión semiestructurada y puntual. Partimos de las señales del MIS (${D.customers.accesible[D.customers.accesible.length - 1][1]} peticiones de formato accesible en septiembre) y de datos externos del INE. Moved el precio o la penetración: el veredicto y el VAN cambian al instante.` },
  { view: 'dss', tab: 'kit', target: '#dss-tornado', who: 1, sec: 20, t: 'Análisis de sensibilidad', txt: 'El tornado indica qué supuesto pesa más en el resultado. Es lo primero que validaríamos con asociaciones y farmacias antes de invertir.' },
  { view: 'dss', tab: 'cap', target: '#dss-weeks', who: 1, sec: 20, t: '¿Tenemos capacidad para Navidad?', txt: 'Segundo modelo: turnos, refuerzos, OEE y stock previo frente a la demanda semanal del Q4. Si subís el crecimiento al 30 %, aparecen roturas en la semana de Black Friday.' },
  { view: 'ess', target: '#ess-bsc', who: 2, sec: 35, t: 'ESS: ¿hacia dónde vamos?', txt: 'El comité ve 16 indicadores en cuatro perspectivas, con semáforo frente a objetivos. Pulsad «Mujeres en puestos de mando»: bajamos al informe del MIS que lo explica.' },
  { view: 'ess', target: '#ess-alerts', who: 2, sec: 25, t: 'Alertas y oportunidades', txt: 'El ESS combina datos internos y externos: dependencia de Amazon, riesgo de suministro, accesibilidad web obligatoria por ley y la oportunidad del Kit Accesible que viene del DSS.' },
  { view: 'cmp', target: '#cmp-table', who: 1, sec: 25, t: 'Comparativa de los cuatro sistemas', txt: 'La matriz responde a la idea clave de la actividad: por qué existe cada sistema y a quién sirve. Elegid un perfil, por ejemplo la directora financiera, para ver qué sistemas usa.' },
  { view: 'odoo', target: () => document.getElementById('h-fields') && document.getElementById('h-fields').closest('section'), who: 1, sec: 15, t: 'Cómo lo implantaríamos en Odoo', txt: 'Cada sistema tiene sus módulos de Odoo. Estos campos personalizados son los que harán que el ERP recoja los datos de inclusión desde el primer día.' },
  { view: 'mis', tab: 'personas', target: '#mis-glass', who: 2, sec: 20, t: 'Indicadores de género, edad y discapacidad', txt: 'Techo de cristal (38 % de mujeres en mando), brecha salarial media frente a la ajustada, pirámide de edad y cuota de discapacidad. Los cruces con datos sensibles nunca muestran grupos de menos de 5 personas.' },
  { view: 'ods', target: '#ods-reflex', who: 2, sec: 30, t: 'Reflexión: lo que no se registra, no se ve', txt: 'Nuestra conclusión: la inclusión empieza en el TPS. Si el sistema no recoge un dato, ningún nivel superior puede verlo. Recogemos la necesidad, no el diagnóstico, con consentimiento y de forma agregada.' },
  { view: 'home', target: '.sys-cards', who: 2, sec: 10, t: 'Cierre', txt: 'Los cuatro sistemas comparten los mismos datos, pero cada uno responde a una pregunta distinta para un usuario distinto. Gracias. ¿Preguntas?' },
];
const Tour = {
  i: -1, el: null, target: null, raf: 0,
  build() {
    if (this.el) return;
    const hole = document.createElement('div'); hole.className = 'tour-hole'; hole.id = 'tour-hole';
    const card = document.createElement('div'); card.className = 'tour-card'; card.id = 'tour-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'false'); card.setAttribute('aria-labelledby', 'tour-t');
    card.innerHTML = `<div class="tour-prog"><span id="tour-bar"></span></div>
      <div class="row" style="justify-content:space-between"><span class="who" id="tour-who"></span><span class="muted" style="font-size:.78rem" id="tour-n"></span></div>
      <h3 id="tour-t"></h3><p id="tour-txt"></p>
      <div class="tour-nav"><button type="button" class="btn btn-ghost btn-sm" id="tour-x">Salir</button>
      <div class="row"><button type="button" class="btn btn-sm" id="tour-prev">${icon('arrowL')}Anterior</button><button type="button" class="btn btn-primary btn-sm" id="tour-next">Siguiente${icon('arrowR')}</button></div></div>`;
    document.body.append(hole, card);
    this.el = card; this.hole = hole;
    $('#tour-x').addEventListener('click', () => this.end());
    $('#tour-prev').addEventListener('click', () => this.go(this.i - 1));
    $('#tour-next').addEventListener('click', () => (this.i >= TOUR.length - 1 ? this.end() : this.go(this.i + 1)));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); $('#tour-next').click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (this.i > 0) this.go(this.i - 1); }
    });
    const re = () => { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.place()); };
    addEventListener('resize', re); addEventListener('scroll', re, { passive: true });
  },
  start(i = 0) { this.build(); this.el.hidden = false; this.hole.hidden = false; document.body.classList.add('touring'); this.go(i); },
  go(i) {
    if (i < 0 || i >= TOUR.length) return;
    this.i = i; const st = TOUR[i];
    if (Drawer.isOpen()) Drawer.close();
    go(st.view, { tab: st.tab, noFocus: true, keepScroll: false });
    const p = PRESENTERS[st.who];
    $('#tour-who').innerHTML = `<i style="background:${p.color}">${p.ini}</i>${esc(p.n)} · ≈ ${st.sec} s`;
    $('#tour-n').textContent = `Paso ${i + 1} de ${TOUR.length}`;
    $('#tour-t').textContent = st.t; $('#tour-txt').textContent = st.txt;
    $('#tour-bar').style.width = `${((i + 1) / TOUR.length) * 100}%`;
    $('#tour-prev').disabled = i === 0;
    $('#tour-next').innerHTML = i === TOUR.length - 1 ? `Terminar${icon('check')}` : `Siguiente${icon('arrowR')}`;
    setTimeout(() => {
      this.target = typeof st.target === 'function' ? st.target() : document.querySelector(st.target);
      if (this.target) this.target.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      setTimeout(() => { this.place(); $('#tour-next').focus({ preventScroll: true }); }, reducedMotion() ? 20 : 420);
    }, 80);
  },
  place() {
    if (this.i < 0 || !this.el || this.el.hidden) return;
    const t = this.target, card = this.el, hole = this.hole;
    const cw = card.offsetWidth, ch = card.offsetHeight, vw = innerWidth, vh = innerHeight;
    if (!t) { hole.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = `${(vw - cw) / 2}px`; card.style.top = `${(vh - ch) / 2}px`; return; }
    const r = t.getBoundingClientRect(); const pad = 8;
    const top = Math.max(6, r.top - pad), left = Math.max(6, r.left - pad);
    const bottom = Math.min(vh - 6, r.bottom + pad), right = Math.min(vw - 6, r.right + pad);
    Object.assign(hole.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, right - left)}px`, height: `${Math.max(0, bottom - top)}px` });
    let cy;
    if (vh - bottom > ch + 20) cy = bottom + 12;
    else if (top > ch + 20) cy = top - ch - 12;
    else cy = vh - ch - 16;
    let cx = clamp(r.left, 16, vw - cw - 16);
    if (cy === vh - ch - 16 && vw > cw * 2) cx = (r.left + r.width / 2) < vw / 2 ? vw - cw - 16 : 16;
    card.style.left = `${cx}px`; card.style.top = `${Math.max(12, cy)}px`;
  },
  end() {
    if (!this.el) return;
    this.el.hidden = true; this.hole.hidden = true; this.i = -1; document.body.classList.remove('touring');
    toast('Recorrido terminado', 'Puedes volver a iniciarlo desde el botón «Recorrido» de la barra superior.', 'play');
  },
  active() { return this.el && !this.el.hidden; },
};
document.addEventListener('click', (e) => { if (e.target.closest('[data-tour-start]')) { e.preventDefault(); Tour.start(0); } });
