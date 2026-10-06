/* ===================================================================== listen.js
   Gráficos que se escuchan (accesibilidad para personas ciegas):
   - lee en voz alta un resumen del gráfico o del panel (síntesis de voz del navegador, en español);
   - después convierte los datos en sonido: cada valor es una nota, más aguda cuanto más alto es,
     y suena de izquierda a derecha como el eje del tiempo.
   El mismo resumen va como descripción oculta para lectores de pantalla y líneas braille. */

const Listen = {
  ac: null, nodes: [], timer: null, btn: null, playing: false,
  /* convierte cifras y símbolos en texto que la voz lee con naturalidad */
  speakable(t) {
    return String(t)
      .replace(/\s?M€/g, ' millones de euros').replace(/\s?k€/g, ' mil euros').replace(/\s?€/g, ' euros')
      .replace(/\s?p\. p\./g, ' puntos porcentuales').replace(/\s?%/g, ' por ciento')
      .replace(/−/g, 'menos ').replace(/[▲▼■↗→]/g, ' ').replace(/\bvs\b/g, 'frente a').replace(/·/g, ',')
      .replace(/\s+/g, ' ').trim();
  },
  voice() {
    const vs = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    return vs.find((x) => /^es[-_]ES/i.test(x.lang) && /natural|online|google/i.test(x.name)) || vs.find((x) => /^es[-_]ES/i.test(x.lang)) || vs.find((x) => /^es/i.test(x.lang)) || null;
  },
  /* lee el texto frase a frase (Chrome corta las locuciones de más de ~15 s); si no hay voz, sigue con los tonos */
  speak(text, done) {
    const ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === 'undefined') { done(); return; }
    ss.cancel();
    const parts = this.speakable(text).split(/(?<=[.;:])\s+/).filter((x) => x.trim()), v = this.voice(), token = (this.token = (this.token || 0) + 1);
    let k = 0, started = false;
    const end = () => { clearTimeout(this.voiceTimer); if (token === this.token) done(); };
    const sayNext = () => {
      if (token !== this.token) return;
      if (k >= parts.length) { end(); return; }
      const u = new SpeechSynthesisUtterance(parts[k++]);
      u.lang = 'es-ES'; u.rate = 1.03; if (v) u.voice = v;
      u.onstart = () => { started = true; };
      u.onend = sayNext; u.onerror = sayNext;
      ss.speak(u);
    };
    this.voiceTimer = setTimeout(() => { if (!started && token === this.token) { ss.cancel(); this.token++; done(); } }, 1500);
    sayNext();
  },
  tones(values, done) {
    const AC = window.AudioContext || window.webkitAudioContext, vals = values.filter((v) => Number.isFinite(v));
    if (!AC || vals.length < 2) { done(); return; }
    const ac = this.ac || (this.ac = new AC());
    if (ac.state === 'suspended') ac.resume();
    const lo = Math.min(...vals), hi = Math.max(...vals), n = values.length;
    const step = Math.min(0.24, Math.max(0.07, 3.4 / n)), t0 = ac.currentTime + 0.08;
    const master = ac.createGain(); master.gain.value = 0.16; master.connect(ac.destination); this.master = master;
    values.forEach((val, i) => {
      if (!Number.isFinite(val)) return;
      const f = 220 * Math.pow(2, 2 * (hi > lo ? (val - lo) / (hi - lo) : 0.5));     // de 220 a 880 Hz (dos octavas)
      const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * step;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.92);
      if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = n > 1 ? -0.8 + (1.6 * i) / (n - 1) : 0; o.connect(g).connect(p).connect(master); } else o.connect(g).connect(master);
      o.start(t); o.stop(t + step); this.nodes.push(o);
    });
    this.timer = setTimeout(done, (0.15 + n * step) * 1000);
  },
  /* resumen hablado y, después, los datos en sonido. Pulsar otra vez el mismo botón lo detiene */
  play(btn, { title, summary, values }) {
    if (this.playing && this.btn === btn) { this.stop(); return; }
    this.stop();
    this.btn = btn; this.playing = true;
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.classList.add('on'); }
    this.speak(`${title}. ${summary}`, () => {
      if (!this.playing || this.btn !== btn) return;
      if (values && values.length > 1) this.tones(values, () => { if (this.btn === btn) this.stop(); }); else this.stop();
    });
  },
  stop() {
    this.token = (this.token || 0) + 1;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearTimeout(this.timer); clearTimeout(this.voiceTimer);
    this.nodes.forEach((o) => { try { o.stop(); } catch (e) { /* ya parado */ } }); this.nodes = [];
    if (this.master) { try { this.master.disconnect(); } catch (e) { /* nada */ } this.master = null; }
    if (this.btn) { this.btn.setAttribute('aria-pressed', 'false'); this.btn.classList.remove('on'); }
    this.btn = null; this.playing = false;
  },
};

/* resúmenes para escuchar: evolución de una serie y ranking de categorías */
function sumSeries(labels, values, fmt) {
  const n = values.length; if (!n) return 'Sin datos.';
  let iMax = 0, iMin = 0; values.forEach((v, i) => { if (v > values[iMax]) iMax = i; if (v < values[iMin]) iMin = i; });
  const ch = values[0] ? values[n - 1] / values[0] - 1 : 0;
  return `Desde ${labels[0]} hasta ${labels[n - 1]}: empieza en ${fmt(values[0])} y termina en ${fmt(values[n - 1])}, ${ch >= 0 ? 'una subida' : 'una bajada'} del ${dec(Math.abs(ch) * 100, 0)} %. ` +
    `El máximo es ${fmt(values[iMax])}, en ${labels[iMax]}, y el mínimo, ${fmt(values[iMin])}, en ${labels[iMin]}.`;
}
function sumRank(items, fmt) {
  const s = items.slice().sort((a, b) => b.value - a.value), last = s[s.length - 1];
  return `El mayor es ${s[0].label}, con ${fmt(s[0].value)}${s[1] ? `; le sigue ${s[1].label}, con ${fmt(s[1].value)}` : ''}${s[2] ? `, y ${s[2].label}, con ${fmt(s[2].value)}` : ''}. ` +
    (s.length > 3 ? `El menor es ${last.label}, con ${fmt(last.value)}.` : '');
}
/* «Escuchar» del panel: lee los indicadores clave tal y como se ven */
function listenPanel(btn) {
  const view = $('#view-' + S.view), h1 = view && view.querySelector('h1');
  const kpis = $$('.kpi', view).map((k) => {
    const l = k.querySelector('.kpi-l'), v = k.querySelector('.kpi-v'), d = k.querySelector('.kpi-d');
    return `${l ? l.textContent : ''}: ${v ? v.textContent : ''}${d && d.textContent.trim() ? ', ' + d.textContent.trim() : ''}`;
  });
  Listen.play(btn, { title: h1 ? h1.textContent : 'Panel', summary: kpis.join('. ') + '.' });
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-listen-panel]'); if (b) { e.preventDefault(); listenPanel(b); } });

// las voces se cargan en segundo plano: se piden al arrancar para tener la española lista
if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices()); }
