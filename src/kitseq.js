/* ===================================================================== kitseq.js
   Kit Kaidora con scroll fotograma a fotograma (como las páginas de producto de Apple). Solo en tableta y escritorio:
   en móvil (MOBILE_MQ) la portada no crea el kit ni pide ningún fotograma.
   Una sola toma: el vídeo 1 generado con Google Flow (kit cerrado → tapa abierta con los aparatos en la bandeja),
   192 fotogramas a 24 fps y 1600 px (src/assets/kit/a_000…a_191.webp).
   Rendimiento:
   - descarga: primero solo el fotograma que se ve (precargado desde el HTML con prioridad alta); el resto, cuando ya se ha pintado
     ese y ha terminado la intro, con prioridad baja, 6 a la vez y de lo grueso a lo fino (1 de cada 8, 4, 2 y el resto).
     Al salir de la portada la descarga se pausa (AbortController) y se reanuda al volver. Con «ahorro de datos», un solo fotograma;
   - los fotogramas se descomprimen EN SEGUNDO PLANO (createImageBitmap) ya al tamaño real del lienzo, solo los cercanos al actual
     y adelantándose en el sentido del scroll; como máximo KIT_WIN.max en memoria;
   - con scroll rápido se descomprime 1 de cada 2, 3 o 4 fotogramas por delante (los demás no llegarían a verse); al parar se
     completan los intermedios;
   - se dibuja solo cuando la animación lo pide y cambia el fotograma (sin bucle propio en cada refresco); el lienzo solo se
     redimensiona cuando cambia el tamaño de la ventana (ResizeObserver con espera). */

// v: versión de los fotogramas (la pone build.py en la web de Netlify para poder guardarlos en caché un año)
const KIT_SEQ = { dir: 'kit/', v: /*__KITV__*/'', n: 192, fw: 1600, fh: 900, top: '#081122', bottom: '#1b2d4f' };
// recorrido (0 → 1): breve pausa al inicio y al final; el resto es la animación del vídeo
const KIT_SPLIT = { start: 0.03, end: 0.97 };
// encuadre del kit en el vídeo (fracciones del ancho/alto): centro y anchura máxima que ocupa durante la animación
const KIT_FIT = { cx: 0.52, cy: 0.52, kitW: 0.55 };
// fotogramas descomprimidos: por delante y por detrás del actual (en pasos), máximo en memoria y descompresiones a la vez
// (antes: { ahead: 20, behind: 6, max: 40, jobs: 4 })
const KIT_WIN = { ahead: 14, behind: 4, max: 20, jobs: 4 };
// descargas de fotogramas a la vez (antes: 10)
const KIT_NET = { parallel: 6 };
const idle = (cb) => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 700 }) : setTimeout(cb, 60));

const KitSeq = {
  state: { p: 0 }, blobs: null, tries: null, queue: null, active: 0, ctrl: null, net: false,
  bmp: new Map(), jobs: 0, want: 0, dir: 1, speed: 0, prevI: 0, gen: 0,
  stage: null, canvas: null, ctx: null, w: 0, h: 0, f: null, bw: 0, bh: 0, shownI: -1, still: false,
  url(i) { return `${KIT_SEQ.dir}a_${String(i).padStart(3, '0')}.webp${KIT_SEQ.v}`; },

  /* ------------------------------------------------ descarga */
  init() {
    if (this.blobs) return;
    const n = KIT_SEQ.n; this.blobs = new Array(n).fill(null); this.tries = new Uint8Array(n);
    const order = [];
    for (let i = 0; i < 12; i++) order.push(i);
    order.push(n - 1);
    [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < n; i += step) order.push(i); });
    const seen = new Set(); this.queue = order.filter((i) => !seen.has(i) && seen.add(i));
  },
  /* el primer fotograma llega por <img> (así aprovecha la precarga del HTML) y se descomprime ya al tamaño del lienzo */
  first(i) {
    if (this.bmp.has(i)) return;
    const gen = this.gen, img = new Image();
    img.decoding = 'async'; if ('fetchPriority' in img) img.fetchPriority = 'high';
    img.src = this.url(i);
    this.bmp.set(i, null); this.jobs++;
    img.decode().then(() => this.bitmap(img)).then((bm) => {
      this.jobs--;
      if (gen !== this.gen || !this.stage) { bm.close(); return; }       // tamaño antiguo o ya fuera de la portada
      this.bmp.set(i, bm); this.later(); this.decode();
    }).catch(() => { this.jobs--; if (gen === this.gen) this.bmp.delete(i); });
  },
  /* resto de fotogramas: prioridad baja, 6 a la vez; se reanuda donde se quedó */
  resume() {
    if (this.net || this.still || !this.stage) return;
    this.net = true; this.ctrl = window.AbortController ? new AbortController() : null;
    this.pump();
  },
  pump() {
    if (!this.net) return;
    const signal = this.ctrl && this.ctrl.signal;
    while (this.active < KIT_NET.parallel && this.queue.length) {
      const i = this.queue.shift();
      if (this.blobs[i]) continue;
      this.active++;
      fetch(this.url(i), { priority: 'low', signal }).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then((b) => { this.active--; this.blobs[i] = b; this.pump(); this.decode(); })
        .catch(() => {
          this.active--;
          if (signal && signal.aborted) { this.queue.unshift(i); return; }       // pausa: vuelve a la cola sin contar como fallo
          // fallo de red (móvil inestable): se reintenta hasta 2 veces al final de la cola
          if (++this.tries[i] <= 2) setTimeout(() => { this.queue.push(i); this.pump(); }, 600 * this.tries[i]);
          this.pump();
        });
    }
  },
  pause() { this.net = false; if (this.ctrl) this.ctrl.abort(); this.ctrl = null; },

  /* ------------------------------------------------ descompresión */
  // tamaño de descompresión: el que ocupa el fotograma en el lienzo (nunca mayor que el original)
  bitmap(src) {
    const o = this.bw && this.bw < KIT_SEQ.fw ? { resizeWidth: this.bw, resizeHeight: this.bh, resizeQuality: 'high' } : undefined;
    return (o ? createImageBitmap(src, o).catch(() => createImageBitmap(src)) : createImageBitmap(src));
  },
  /* descomprime en segundo plano los fotogramas que rodean al actual (más hacia donde se mueve el scroll) */
  decode() {
    if (!this.blobs || !this.stage) return;
    const n = KIT_SEQ.n, c = this.want, fwd = this.dir >= 0, gen = this.gen;
    // paso según la velocidad (fotogramas que avanza el scroll en cada refresco de pantalla): con scroll rápido no hace falta
    // descomprimir los fotogramas intermedios, que no llegarían a verse
    const step = Math.max(1, Math.min(4, Math.round(this.speed)));
    // con scroll rápido se apunta adonde estará el scroll cuando termine la descompresión (~3 refrescos), no adonde está ahora
    const lead = Math.round(Math.min(48, this.speed * 3)), cp = Math.max(0, Math.min(n - 1, c + (fwd ? lead : -lead)));
    const lo = Math.max(0, Math.min(c, cp) - (fwd ? KIT_WIN.behind : KIT_WIN.ahead * step)), hi = Math.min(n - 1, Math.max(c, cp) + (fwd ? KIT_WIN.ahead * step : KIT_WIN.behind));
    const cand = [];
    for (let i = lo; i <= hi; i++) if (!this.bmp.has(i) && this.blobs[i]) cand.push(i);
    // primero los que caen en el paso (y a igual distancia, hacia donde va el scroll); luego los intermedios
    const off = (i) => ((i - cp) % step !== 0 ? n : 0);
    cand.sort((a, b) => off(a) - off(b) || Math.abs(a - cp) - Math.abs(b - cp) || (fwd ? b - a : a - b));
    for (const i of cand) {
      if (this.jobs >= KIT_WIN.jobs) break;
      // con la memoria llena, solo se descomprime si es más útil que el menos útil de los que hay (ver score)
      if (this.bmp.size >= KIT_WIN.max && !this.betterThanWorst(i)) break;
      this.jobs++; this.bmp.set(i, null);              // en curso
      this.bitmap(this.blobs[i]).then((bm) => {
        this.jobs--;
        if (gen !== this.gen || !this.stage || !this.bmp.has(i)) bm.close();   // tamaño antiguo o ya liberado
        else {
          this.bmp.set(i, bm); this.trim();
          // si queda más cerca del pedido que el que se ve, se vuelve a dibujar
          if (this.shownI < 0 || Math.abs(i - this.want) < Math.abs(this.shownI - this.want)) this.later();
        }
        this.decode();
      }).catch(() => { this.jobs--; if (gen === this.gen) this.bmp.delete(i); });
    }
  },
  /* utilidad de un fotograma en memoria (menor = más útil): la distancia al actual, pero los que ya han quedado atrás en el
     sentido del scroll cuentan como 4 veces más lejanos; así la memoria (KIT_WIN.max) se dedica a los que vienen */
  score(k) { const d = (k - this.want) * (this.dir >= 0 ? 1 : -1); return d >= 0 ? d : -d * 4; },
  betterThanWorst(i) {
    let worst = -1;
    for (const [k, bm] of this.bmp) if (bm && k !== this.shownI) worst = Math.max(worst, this.score(k));
    return this.score(i) < worst;
  },
  /* libera los fotogramas menos útiles cuando hay demasiados en memoria */
  trim() {
    if (this.bmp.size <= KIT_WIN.max) return;
    const far = [...this.bmp.keys()].filter((k) => this.bmp.get(k) && k !== this.shownI).sort((a, b) => this.score(b) - this.score(a));
    for (const k of far) { if (this.bmp.size <= KIT_WIN.max) break; this.bmp.get(k).close(); this.bmp.delete(k); }
  },
  flush() {
    this.gen++;
    for (const bm of this.bmp.values()) if (bm && bm.close) bm.close();
    this.bmp.clear(); this.shownI = -1;          // las descompresiones en curso terminan solas y se descartan (gen)
  },
  later() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); },
  idx(p) { const S = KIT_SPLIT, t = Math.max(0, Math.min(1, (p - S.start) / (S.end - S.start))); return Math.round(t * (KIT_SEQ.n - 1)); },
  /* fotograma descomprimido más cercano al pedido (mientras se descomprime el exacto); a igual distancia, el que ya pasó */
  near(i) {
    if (this.bmp.get(i)) return i;
    for (let d = 1; d < KIT_SEQ.n; d++) {
      const a = i - d * this.dir, b = i + d * this.dir;
      if (this.bmp.get(a)) return a;
      if (this.bmp.get(b)) return b;
      if ((a < 0 || a >= KIT_SEQ.n) && (b < 0 || b >= KIT_SEQ.n)) break;
    }
    return -1;
  },

  /* ------------------------------------------------ portada */
  /* still: portada estática (reducir movimiento o ahorro de datos): un solo fotograma, el del kit abierto, sin más descargas */
  attach(stage, { still = false } = {}) {
    this.stage = stage; this.still = still;
    this.init();
    if (!this.canvas) { this.canvas = document.createElement('canvas'); this.ctx = this.canvas.getContext('2d'); }
    stage.appendChild(this.canvas);
    this.scene = stage.parentElement;
    this.seamT = $('.kit-seam-t', this.scene); this.seamB = $('.kit-seam-b', this.scene);
    this.w = 0; this.shownI = -1;
    this.resize();
    if (!this.ro) this.ro = new ResizeObserver(() => { clearTimeout(this.roT); this.roT = setTimeout(() => { if (this.stage) { this.resize(); this.draw(); } }, 150); });
    this.ro.observe(stage);
    const firstI = still ? KIT_SEQ.n - 1 : this.idx(this.state.p);
    if (!this.blobs[firstI]) this.first(firstI);
    // el resto de fotogramas: cuando se ha pintado el primero y ha terminado la intro
    if (!still) {
      const go = () => { if (this.stage && !this.still) idle(() => this.resume()); };
      this.whenPainted = new Promise((ok) => { this.onPainted = ok; });
      Promise.all([this.whenPainted, Intro.finished || Promise.resolve()]).then(go);
    }
    this.decode();
  },
  /* al salir de la portada: descarga en pausa y memoria de los fotogramas descomprimidos liberada */
  detach() {
    if (this.ro && this.stage) this.ro.unobserve(this.stage);
    clearTimeout(this.roT); clearTimeout(this.idleT);
    this.stage = null; this.onPainted = null;
    this.pause(); this.flush();
  },
  resize() {
    if (!this.stage) return;
    const w = this.stage.clientWidth || innerWidth, h = this.stage.clientHeight || innerHeight;
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    const f = this.f = this.fit();
    // el lienzo no necesita más resolución que la del propio vídeo
    const r = Math.min(window.devicePixelRatio || 1, Math.max(1, 1 / f.s));
    this.canvas.width = Math.round(w * r); this.canvas.height = Math.round(h * r);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.ctx.setTransform(r, 0, 0, r, 0, 0); this.ctx.imageSmoothingQuality = 'high';
    // tamaño al que se descomprimen los fotogramas: el que ocupan en el lienzo; si cambia, se vuelven a descomprimir
    const bw = Math.min(KIT_SEQ.fw, Math.round(KIT_SEQ.fw * f.s * r)), bh = Math.min(KIT_SEQ.fh, Math.round(KIT_SEQ.fh * f.s * r));
    if (bw !== this.bw || bh !== this.bh) {
      const had = this.bmp.size > 0; this.bw = bw; this.bh = bh;
      if (had) { this.flush(); const keep = this.want; if (!this.blobs[keep]) this.first(keep); this.decode(); }
    }
    // fondo y costuras fijas: por encima y por debajo del vídeo, el color de sus bordes
    const top = f.y, bot = f.y + KIT_SEQ.fh * f.s, fade = KIT_SEQ.fh * f.s * 0.18;
    if (this.scene) this.scene.style.background = `linear-gradient(180deg, ${KIT_SEQ.top} 0, ${KIT_SEQ.top} ${Math.max(0, top).toFixed(0)}px, ${KIT_SEQ.bottom} ${Math.min(h, bot).toFixed(0)}px, ${KIT_SEQ.bottom} 100%)`;
    if (this.seamT) Object.assign(this.seamT.style, { display: top > 0 ? 'block' : 'none', top: (top - 1).toFixed(0) + 'px', height: fade.toFixed(0) + 'px' });
    if (this.seamB) Object.assign(this.seamB.style, { display: bot < h ? 'block' : 'none', top: (bot - fade + 1).toFixed(0) + 'px', height: fade.toFixed(0) + 'px' });
    this.shownI = -1;
  },
  /* encuadre: llena la pantalla pero siempre deja el kit entero a la vista (en vertical recorta los lados) */
  fit() {
    const { fw, fh } = KIT_SEQ, w = this.w, h = this.h;
    const s = Math.min(Math.max(w / fw, h / fh), (w * 0.94) / (fw * KIT_FIT.kitW));
    const portrait = w < h;
    return { s, x: w / 2 - fw * KIT_FIT.cx * s, y: h / 2 - fh * KIT_FIT.cy * s + (portrait ? -h * 0.08 : h * 0.02) };
  },
  /* lo llama la animación de scroll en cada actualización: velocidad (para el paso de descompresión) y dibujo */
  update() {
    const i = this.idx(this.state.p);
    this.speed = this.speed * 0.75 + Math.abs(i - this.prevI) * 0.25; this.prevI = i;
    this.draw();
    // al parar el scroll, se completan los fotogramas intermedios
    clearTimeout(this.idleT);
    this.idleT = setTimeout(() => { this.speed = 0; this.decode(); }, 160);
  },
  draw() {
    if (!this.stage || !this.f) return;
    const i = this.idx(this.state.p);
    if (i !== this.want) { this.dir = i > this.want ? 1 : -1; this.want = i; this.decode(); }
    const k = this.near(i);
    if (k >= 0 && k !== this.shownI) {
      const f = this.f;
      this.ctx.clearRect(0, 0, this.w, this.h); this.ctx.drawImage(this.bmp.get(k), f.x, f.y, KIT_SEQ.fw * f.s, KIT_SEQ.fh * f.s);
      this.shownI = k;
      if (this.onPainted) { this.onPainted(); this.onPainted = null; }
    }
  },
};
