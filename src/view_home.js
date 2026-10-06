/* ===================================================================== view_home.js
   Inicio.
   - Tableta y escritorio: el kit Kaidora se abre con el scroll, fotograma a fotograma, y, al bajar, las 4 categorías suben sobre
     el kit. Scroll suave con Lenis + GSAP ScrollTrigger (se descargan solo aquí: en móvil no hacen falta).
   - Móvil (MOBILE_MQ, en config.js): solo el logo y las 4 categorías, sin kit, sin fotogramas, sin GSAP ni Lenis.
   Dibujos de las tarjetas: Fluent Emoji 3D © Microsoft Corporation, licencia MIT (github.com/microsoft/fluentui-emoji).
   Con «reducir movimiento» o «ahorro de datos» la portada de escritorio queda estática con el kit ya abierto (un solo fotograma). */

const HOME_META = {
  tps: { name: 'Procesamiento de transacciones' },
  mis: { name: 'Información gerencial' },
  dss: { name: 'Apoyo a la decisión' },
  ess: { name: 'Información para la dirección' },
};
const ART = /*__ART__*/ {};
// pantalla vertical (tableta): las tarjetas se solapan con la parte vacía bajo el kit (ver .home-cards-sec en styles_v3.css)
const HOME_PORTRAIT = () => matchMedia('(orientation: portrait) and (max-width: 900px)').matches;
const HOME_MOBILE = () => matchMedia(MOBILE_MQ).matches;
const SAVE_DATA = !!(navigator.connection && navigator.connection.saveData);
// animación de la portada de escritorio: hace falta GSAP (aún puede no haber llegado) y que no se pida menos movimiento o datos
const WANTS_FX = () => !reducedMotion() && !SAVE_DATA;
const HAS_FX = () => WANTS_FX() && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
let HOME_SEEN = false;

/* GSAP + ScrollTrigger + Lenis: en la web de Netlify van en un archivo aparte que solo se pide para la portada de escritorio
   (el HTML lo precarga si la pantalla no es de móvil); en la versión de Claude van incrustados y ya están cargados */
const VENDOR_URL = /*__VENDOR_URL__*/'';
let vendorP = null, vendorFailed = false;
function loadVendor() {
  if (typeof gsap !== 'undefined' || !VENDOR_URL) return Promise.resolve();
  if (!vendorP) vendorP = new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = VENDOR_URL; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
  return vendorP;
}

function homeFacts() {
  const sep = agg([LAST], ALL).rev;
  const ytd = agg(range(T('2026-01'), LAST), ALL).rev;
  const npv = kitModel(KIT_BASE).npv;
  return [
    { l: 'tps', to: TPSDAY.orders.length, fmt: (v) => fmtN(v), unit: 'pedidos hoy' },
    { l: 'mis', to: sep, fmt: (v) => fmtEur(v), unit: 'en septiembre' },
    { l: 'dss', to: npv, fmt: (v) => (v >= 0 ? '+' : '') + fmtEur(v), unit: 'VAN del nuevo kit' },
    { l: 'ess', to: ytd / TARGET_2026, fmt: (v) => fmtPct(v, 0), unit: 'del objetivo 2026' },
  ];
}
function kitState(v) { KitSeq.state.p = v; KitSeq.dirty = true; }
/* tarjetas: en escritorio los dibujos se cargan al acercarse (la portada empieza con el kit); en móvil se ven al momento */
function cardsHtml(mobile) {
  return homeFacts().map((f, i) => {
    const m = HOME_META[f.l], v = f.fmt(f.to);
    return `<button type="button" class="hc" data-card="${f.l}" style="--i:${i}" aria-label="${f.l.toUpperCase()}, ${m.name}: ${esc(v)} ${f.unit}. Abrir panel">
      <span class="hc-go" aria-hidden="true">${icon('arrowR')}</span>
      <span class="hc-art" aria-hidden="true"><span class="hc-halo"></span><span class="hc-shadow"></span><img src="${ART[f.l] || ''}" alt="" width="256" height="256" decoding="async"${mobile ? ' fetchpriority="high"' : ' loading="lazy"'} draggable="false"></span>
      <span class="hc-acr">${f.l.toUpperCase()}</span>
      <span class="hc-name">${m.name}</span>
      <span class="hc-kpi"><b data-i="${f.l}">${v}</b><small>${f.unit}</small></span>
    </button>`;
  }).join('');
}

/* ---------------------------------------------------------------- render */
RENDER.home = function () {
  const keepY = S.view === 'home' && HomeFX.ctx ? window.scrollY : null;
  const back = HOME_SEEN && keepY === null;       // al volver de un panel se llega directamente a las tarjetas
  HomeFX.stop();
  if (HOME_MOBILE()) { renderHomeMobile(); HOME_SEEN = true; return; }
  $('#view-home').removeAttribute('data-pre');      // la portada móvil escrita en el HTML no sirve en escritorio
  // escritorio: si GSAP aún no ha llegado, se pide (ya estaba precargado) y se pinta la portada en cuanto llega
  if (WANTS_FX() && typeof gsap === 'undefined' && !vendorFailed) {
    mount('view-home', '<div class="home"><div class="home-bg" aria-hidden="true"><i></i><i></i></div></div>');
    loadVendor().catch(() => { vendorFailed = true; }).then(() => { if (S.view === 'home' && !HOME_MOBILE()) RENDER.home(); });
    return;
  }
  const fx = HAS_FX();
  const el = mount('view-home', `<div class="home${fx ? '' : ' static'}">
    <div class="home-bg" aria-hidden="true"><i></i><i></i></div>
    <section class="kit-scene" aria-label="Kaidora Personal Health Kit">
      <div class="kit-stage" aria-hidden="true"></div>
      <div class="kit-seam-t" aria-hidden="true"></div><div class="kit-seam-b" aria-hidden="true"></div><div class="kit-vignette" aria-hidden="true"></div>
      <div class="kit-card"><b>Kit de salud personal</b><span>Tu salud, siempre a mano</span></div>
      <div class="h-scroll" aria-hidden="true"><i><span></span></i></div>
    </section>
    <div class="kit-spacer" aria-hidden="true" style="height:${KIT_SCROLL_VH}vh"></div>
    <section class="home-cards-sec" aria-label="Sistemas de información">
      <h1 class="sr-only">Kaidora · Panel de gestión</h1>
      <div class="home-grid">${cardsHtml(false)}</div>
    </section>
  </div>`);
  $$('.hc', el).forEach((b) => b.addEventListener('click', () => morphTo(b, b.dataset.card)));
  KitSeq.attach($('.kit-stage', el), { still: !fx });
  if (fx) HomeFX.start(el, { back, keepY });
  else { kitState(1); KitSeq.draw(); }
  HOME_SEEN = true;
};

/* móvil: solo el logo (barra superior) y las 4 categorías, que caben sin scroll; entrada con un fundido corto */
function homeMobileHtml() {
  return `<div class="home home-m">
    <div class="home-bg" aria-hidden="true"><i></i><i></i></div>
    <section class="home-cards-sec" aria-label="Sistemas de información">
      <h1 class="sr-only">Kaidora · Panel de gestión</h1>
      <div class="home-grid">${cardsHtml(true)}</div>
    </section>
  </div>`;
}
// huella de un texto (FNV-1a): build.py la guarda junto a la portada móvil que escribe en el HTML
const strHash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
function renderHomeMobile() {
  const host = $('#view-home'), html = homeMobileHtml(), pre = host.getAttribute('data-pre');
  // la portada móvil ya viene pintada en el HTML (build.py, con este mismo código y los mismos datos): si es idéntica, se aprovecha
  // tal cual (sin repintar ni repetir el fundido) y solo se le añaden los eventos
  let el;
  if (pre && pre === strHash(html) && host.querySelector('.home-m')) { host.querySelector('.home-m').classList.add('no-anim'); el = host; }
  else el = mount('view-home', html);
  host.removeAttribute('data-pre');
  $$('.hc', el).forEach((b) => b.addEventListener('click', () => go(b.dataset.card)));
}
// al cruzar el límite de MOBILE_MQ (girar la tableta, cambiar el tamaño de la ventana) la portada se vuelve a pintar en su versión
(() => {
  const mq = matchMedia(MOBILE_MQ), onChange = () => { if (S.view === 'home') RENDER.home(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
})();

/* ---------------------------------------------------------------- animación de la portada */
const HomeFX = {
  ctx: null, lenis: null, raf: null,
  start(root, { back, keepY }) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (typeof Lenis !== 'undefined') {
      // lerp: sigue a la rueda o al panel táctil con suavidad pero sin la inercia larga de antes (1,1 s), que se notaba como retraso
      this.lenis = new Lenis({ lerp: LENIS_LERP, smoothWheel: true, wheelMultiplier: 1.05 });
      this.lenis.on('scroll', ScrollTrigger.update);
      this.raf = (time) => { if (this.lenis) this.lenis.raf(time * 1000); };
      gsap.ticker.add(this.raf); gsap.ticker.lagSmoothing(0);
      if (Intro.active) this.lenis.stop();
    }
    const facts = homeFacts();
    kitState(0);
    this.ctx = gsap.context(() => {
      // la entrada empieza poco antes de que acabe la intro (antes: a los 0,75 s de una intro de 1 s)
      const delay = Intro.active ? Math.max(0.05, Intro.remaining() - 0.27) : 0.05;
      // entrada tras la pantalla de carga (solo al llegar por arriba: al volver de un panel se aterriza en las tarjetas sin entrada,
      // porque si no la animación de entrada seguía en marcha y el scroll guardaba sus valores a medias → el kit se veía oscuro al subir)
      if (!back && keepY == null) {
        gsap.from('.kit-stage', { opacity: 0, scale: 0.94, y: 30, duration: 1.1, ease: 'expo.out', delay });
        gsap.from('.kit-card', { opacity: 0, y: 24, duration: 0.9, ease: 'expo.out', delay: delay + 0.15 });
      }
      // la escena queda fija mientras pasa el espaciador y las tarjetas suben por encima
      ScrollTrigger.create({ trigger: '.kit-scene', start: 'top top', endTrigger: '.home-cards-sec', end: 'top top', pin: true, pinSpacing: false });
      // apertura del kit (KIT_SCROLL_VH de scroll); el lienzo se dibuja desde aquí, solo cuando la animación avanza
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.kit-spacer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
      tl.to('.h-scroll', { opacity: 0, duration: 0.05 }, 0)
        .to(KitSeq.state, { p: 1, duration: 1, onUpdate: () => KitSeq.update() }, 0);
      // las tarjetas suben: el kit se aleja y se atenúa. Valores de partida explícitos (no dependen de la entrada) y, si la entrada
      // aún corre, se le quitan la opacidad y la escala (overwrite) para que nunca se pisen.
      // En vertical (móvil/tableta) las tarjetas suben justo bajo el kit abierto: el atenuado empieza cuando empiezan a taparlo.
      gsap.timeline({ defaults: { ease: 'none', immediateRender: false, overwrite: 'auto' }, scrollTrigger: { trigger: '.home-cards-sec', start: () => (HOME_PORTRAIT() ? 'top 58%' : 'top bottom'), end: 'top 12%', scrub: true } })
        .fromTo('.kit-stage', { scale: 1, opacity: 1 }, { scale: 0.92, opacity: 0.22 }, 0)
        .fromTo('.kit-card', { opacity: 1 }, { opacity: 0 }, 0);
      // entrada de las tarjetas y contadores
      const cards = $$('.hc', root), cardsIn = () => (HOME_PORTRAIT() ? 'top 88%' : 'top 62%');
      gsap.from(cards, { y: 70, opacity: 0, scale: 0.95, duration: 1, ease: 'back.out(1.3)', stagger: 0.08, scrollTrigger: { trigger: '.home-cards-sec', start: cardsIn } });
      ScrollTrigger.create({ trigger: '.home-cards-sec', start: cardsIn, once: true, onEnter: () => facts.forEach((f, i) => {
        const b = $(`.hc-kpi b[data-i="${f.l}"]`, root), o = { v: 0 };
        gsap.to(o, { v: f.to, duration: 1.3, ease: 'power3.out', delay: 0.2 + i * 0.08, onUpdate: () => { b.textContent = f.fmt(o.v); }, onComplete: () => { b.textContent = f.fmt(f.to); } });
      }) });
      cardFX(cards);
    }, root);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this.ctx) ScrollTrigger.refresh(); });
    if (back || keepY != null) {
      setTimeout(() => {
        if (!this.ctx) return;
        ScrollTrigger.refresh();
        const y = back ? ScrollTrigger.maxScroll(window) : keepY;
        if (this.lenis) this.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      }, 60);
    }
  },
  stop() {
    if (this.ctx) { this.ctx.revert(); this.ctx = null; }
    if (this.lenis) { gsap.ticker.remove(this.raf); this.lenis.destroy(); this.lenis = null; }
    // fuera de la portada se recupera el suavizado de GSAP: tras un fotograma pesado (montar un panel) las animaciones no saltan
    if (typeof gsap !== 'undefined') gsap.ticker.lagSmoothing(500, 33);
    KitSeq.detach();
  },
};
LEAVE.home = () => { HomeFX.stop(); Tip.hide(); };

/* tarjetas: flotación del dibujo, inclinación 3D que sigue al ratón y foco de luz */
function cardFX(cards) {
  const loops = [];
  cards.forEach((c, i) => {
    const img = $('.hc-art img', c), sh = $('.hc-shadow', c), d = 2.8 + i * 0.35, art = $('.hc-art', c);
    loops.push(gsap.to(img, { y: -12, rotation: i % 2 ? 2.5 : -2.5, duration: d, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2, paused: true }),
      gsap.to(sh, { scale: 0.82, opacity: 0.55, duration: d, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2, paused: true }));
    gsap.set(c, { transformPerspective: 1100 });
    const q = (t, p) => gsap.quickTo(t, p, { duration: 0.6, ease: 'power3.out' });
    const rx = q(c, 'rotationX'), ry = q(c, 'rotationY'), ax = q(art, 'x'), ay = q(art, 'y');
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      ry((px - 0.5) * 11); rx(-(py - 0.5) * 9); ax((px - 0.5) * 22); ay((py - 0.5) * 16);
    });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); ax(0); ay(0); });
  });
  // la flotación solo corre con las tarjetas a la vista: mientras se abre el kit no gasta fotogramas
  ScrollTrigger.create({ trigger: '.home-cards-sec', start: 'top bottom', end: 'bottom top', onToggle: (st) => loops.forEach((t) => (st.isActive ? t.resume() : t.pause())) });
}

/* ---------------------------------------------------------------- transición tarjeta → panel */
function morphTo(btn, view) {
  if (!HAS_FX()) { go(view); return; }
  const r = btn.getBoundingClientRect(), m = $('#morph'), img = $('.hc-art img', btn), ir = img.getBoundingClientRect();
  const canvas = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim() || '#f5f6f8';
  if (HomeFX.lenis) HomeFX.lenis.stop();
  m.innerHTML = `<img src="${img.src}" alt="" style="width:${ir.width}px;height:${ir.height}px">`;
  m.hidden = false;
  gsap.set(m, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 28, backgroundColor: '#12285a', opacity: 1 });
  gsap.timeline()
    .to(btn, { opacity: 0, duration: 0.1 }, 0)
    .to(m, { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0, backgroundColor: canvas, duration: 0.48, ease: 'expo.inOut' }, 0)
    .to($('img', m), { scale: 1.8, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.04)
    .add(() => go(view))
    .to(m, { opacity: 0, duration: 0.25, ease: 'power2.out', onComplete: () => { m.hidden = true; m.innerHTML = ''; } });
}

/* ---------------------------------------------------------------- pantalla de carga con el logo
   La anima el CSS desde el primer pintado (no espera al JavaScript), dura INTRO_MAX_S y no se repite en la misma sesión
   (lo decide el script del <head>). Aquí solo se calcula cuánto le queda, se retira al terminar y se avisa a la portada. */
const Intro = {
  active: false, end: 0, finished: null,
  play() {
    let resolve; this.finished = new Promise((ok) => { resolve = ok; });
    const el = $('#intro');
    const finish = () => {
      if (el && el.isConnected) el.remove();
      document.documentElement.classList.remove('intro-on');
      const was = this.active; this.active = false; resolve();
      if (was) { if (HomeFX.lenis) HomeFX.lenis.start(); if (HomeFX.ctx) ScrollTrigger.refresh(); }
    };
    if (!el || reducedMotion() || getComputedStyle(el).display === 'none') { finish(); return; }
    const rem = this.remainingMs(el);
    if (rem <= 30) { finish(); return; }
    this.active = true; this.end = performance.now() + rem;
    document.documentElement.classList.add('intro-on');
    setTimeout(finish, rem);
    const skip = () => { el.style.display = 'none'; finish(); };
    el.addEventListener('click', skip, { once: true });
    document.addEventListener('keydown', function k(e) { if (Intro.active && e.key === 'Escape') skip(); document.removeEventListener('keydown', k); });
  },
  // tiempo que le queda a la animación CSS de salida (introOut) del velo
  remainingMs(el) {
    const a = el.getAnimations ? el.getAnimations().find((x) => x.animationName === 'introOut') : null;
    if (!a || a.currentTime == null) return 0;
    return Math.max(0, a.effect.getComputedTiming().endTime - a.currentTime);
  },
  remaining() { return this.active ? Math.max(0, (this.end - performance.now()) / 1000) : 0; },
};
