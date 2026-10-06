// Verificaciones funcionales de la nueva versión (paso 1 y 2):
//  - scroll rápido en la portada de escritorio: fotogramas sustitutos (saltos visibles) y memoria de bitmaps;
//  - Lenis: cuánto tarda en asentarse el scroll al soltar la rueda;
//  - cambio de tamaño 390 → 1280 → 390 sin recargar: portada correcta, sin errores y sin fotogramas mientras es móvil;
//  - portada móvil a 375×667 y 390×844: logo + 4 tarjetas sin scroll, sin lienzo, 0 peticiones a /kit/ (capturas);
//  - consola sin errores con prefers-reduced-motion.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8790';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};

// 1. scroll rápido (escritorio) con todos los fotogramas ya descargados
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/?perfdebug#home`); await sleep(7000);
  await p.evaluate(() => { window.__sub = 0; window.__gap = 0; window.__n = 0; window.__run = true; const k = window.__kaidora.KitSeq;
    const loop = () => { if (k.shownI >= 0) { window.__n++; const d = Math.abs(k.shownI - k.want); if (d > 0) { window.__sub++; window.__gap = Math.max(window.__gap, d); } } if (window.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, 160); await sleep(16); }      // muy rápido: ~1,7 pantallas en 0,4 s
  await sleep(500);
  for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, -160); await sleep(16); }
  await sleep(800);
  out.scroll_rapido = await p.evaluate(() => { window.__run = false; const k = window.__kaidora.KitSeq, W = window.__kaidora.KIT_WIN;
    return { fotogramas_pantalla: window.__n, con_sustituto: window.__sub, salto_max: window.__gap, bitmaps_max: W.max, bitmap: `${k.bw}×${k.bh}`, memoria_max_MB: Math.round(W.max * k.bw * k.bh * 4 / 1048576) }; });
  // 2. Lenis: asentamiento al soltar la rueda (desde el último evento hasta que scrollY deja de moverse)
  await p.evaluate(() => window.scrollTo(0, 0)); await sleep(800);
  for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 100); await sleep(30); }
  out.lenis_asentado_ms = await p.evaluate(() => new Promise((ok) => { const t0 = performance.now(); let last = scrollY, still = 0; const f = () => { if (Math.abs(scrollY - last) < 0.5) still++; else still = 0; last = scrollY; if (still >= 3) ok(Math.round(performance.now() - t0 - 3 * 16.7)); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  out.errores_escritorio = errs;
  await p.close();
}

// 3. cambio de tamaño sin recargar
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [], kit = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let phase = 'movil-1';
  p.on('request', (r) => { if (/\/kit\//.test(r.url())) kit.push(phase); });
  await p.goto(`${BASE}/#home`); await sleep(2500);
  const st = () => p.evaluate(() => ({ canvas: !!document.querySelector('.kit-stage canvas'), movil: !!document.querySelector('.home-m'), tarjetas: document.querySelectorAll('.hc').length, lenis: document.documentElement.classList.contains('lenis') }));
  const s1 = await st();
  phase = 'escritorio'; await p.setViewportSize({ width: 1280, height: 800 }); await sleep(3000);
  const s2 = await st();
  phase = 'movil-2'; await p.setViewportSize({ width: 390, height: 844 }); await sleep(1500);
  const before = kit.length; await sleep(2500); const s3 = await st();
  out.cambio_tamano = { movil_1: s1, escritorio_1280: s2, movil_2: s3, peticiones_kit: { movil_1: kit.filter((x) => x === 'movil-1').length, escritorio: kit.filter((x) => x === 'escritorio').length, movil_2: kit.filter((x) => x === 'movil-2').length, tras_volver_a_movil: kit.length - before }, errores: errs };
  await ctx.close();
}

// 4. portada móvil: capturas y comprobaciones
out.portada_movil = {};
for (const [w, h] of [[375, 667], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const kit = []; p.on('request', (r) => { if (/\/kit\//.test(r.url())) kit.push(r.url()); });
  await p.goto(`${BASE}/#home`); await sleep(2500);
  out.portada_movil[`${w}x${h}`] = await p.evaluate(() => ({
    logo: !!document.querySelector('.appbar .brand .logo'), canvas: !!document.querySelector('canvas'),
    tarjetas_visibles_sin_scroll: [...document.querySelectorAll('.hc')].filter((c) => { const r = c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 0.5; }).length,
    scroll_posible: document.documentElement.scrollHeight - innerHeight, h1: document.querySelector('h1.sr-only')?.textContent }));
  out.portada_movil[`${w}x${h}`].peticiones_kit = kit.length;
  await p.screenshot({ path: `portada_movil_${w}x${h}.png` });
  await ctx.close();
}

// 5. consola con movimiento reducido (escritorio y móvil, todas las vistas)
out.errores_reducido = [];
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => out.errores_reducido.push(`${w} ${e.message}`)); p.on('console', (x) => { if (x.type() === 'error' || x.type() === 'warning') out.errores_reducido.push(`${w} ${x.text()}`); });
  for (const v of ['home', 'tps', 'mis', 'dss', 'ess', 'home']) { await p.goto(`${BASE}/#${v}`); await sleep(1200); }
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
