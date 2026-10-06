// Medidas de rendimiento de la web de Kaidora (paso 0 y verificación final).
// Uso: node medir.mjs <url-base> <salida.json> [--lh-runs 3] [--solo-lighthouse] [--sin-lighthouse]
//   p. ej.  node medir.mjs http://localhost:8790 antes.json
// Mide:
//  1. Lighthouse móvil y escritorio (LCP, TBT, CLS, bytes transferidos, peticiones a /kit/), mediana de N ejecuciones.
//  2. Scroll con la rueda (Playwright, Chrome): portada de escritorio 1440×900 (toda la animación) y móvil 390×844
//     (portada, TPS y MIS), con la CPU normal y 4× más lenta: duración de cada fotograma (p50/p95/máx) y
//     long-animation-frames de más de 50 ms y de más de 100 ms.
//  3. Cambio de vista: del clic en la tarjeta (o en la pestaña) hasta que la vista está pintada con sus gráficos.
//  4. Segunda visita: peticiones que vuelven a la red (ni caché de disco ni de memoria) para /kit/ y archivos con hash.
import fs from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const BASE = args[0] || 'http://localhost:8790';
const OUT = args[1] || 'medida.json';
const flag = (n) => args.includes(n);
const LH_RUNS = +(args[args.indexOf('--lh-runs') + 1] || 3) || 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

/* ------------------------------------------------------------------ 1. Lighthouse */
// Un solo Chrome por tipo de dispositivo y una pasada de calentamiento que se descarta: la primera página de un navegador
// recién arrancado tarda ~2 s en pintar por el arranque en frío (proceso de GPU), sea cual sea la web. Lighthouse borra la caché
// del sitio en cada ejecución, así que todas son primeras visitas.
async function lh(url, form) {
  const runs = [];
  const chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
  try {
  for (let k = -1; k < LH_RUNS; k++) {
    {
      const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] };
      const res = await lighthouse(url, flags, form === 'escritorio' ? desktopConfig : undefined);
      if (k < 0) continue;   // calentamiento
      const a = res.lhr.audits;
      const items = (a['network-requests'].details || {}).items || [];
      runs.push({
        lcp: a['largest-contentful-paint'].numericValue, tbt: a['total-blocking-time'].numericValue,
        cls: a['cumulative-layout-shift'].numericValue, fcp: a['first-contentful-paint'].numericValue,
        bytes: a['total-byte-weight'].numericValue, peticiones: items.length,
        kit: items.filter((i) => /\/kit\//.test(i.url)).length,
        kitBytes: items.filter((i) => /\/kit\//.test(i.url)).reduce((s, i) => s + (i.transferSize || 0), 0),
        lcpElemento: ((a['largest-contentful-paint-element'] || {}).details || {}).items ? JSON.stringify(a['largest-contentful-paint-element'].details.items).match(/"snippet":"([^"]{0,90})/)?.[1] || '' : '',
        puntuacion: Math.round(res.lhr.categories.performance.score * 100),
      });
    }
  }
  } finally { await chrome.kill(); }
  const m = (k) => median(runs.map((r) => r[k]));
  return { lcp_ms: Math.round(m('lcp')), tbt_ms: Math.round(m('tbt')), cls: r1(m('cls') * 1000) / 1000, fcp_ms: Math.round(m('fcp')), bytes_kb: Math.round(m('bytes') / 1024),
    peticiones: m('peticiones'), peticiones_kit: m('kit'), kit_kb: Math.round(m('kitBytes') / 1024), puntuacion: m('puntuacion'), lcp_elemento: runs[0].lcpElemento, ejecuciones: runs.length };
}

/* ------------------------------------------------------------------ 2. scroll */
const GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
async function newPage(browser, { mobile, cpu, reduced = false }) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  return { ctx, page, cdp, errores };
}
const introDone = (page) => page.waitForFunction(() => !document.getElementById('intro') || getComputedStyle(document.getElementById('intro')).display === 'none' || +getComputedStyle(document.getElementById('intro')).opacity === 0, null, { timeout: 30000 }).catch(() => {});

async function scrollTest(page, steps = 80, everyMs = 50) {
  const total = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const delta = Math.max(40, Math.ceil(total / steps * 1.05));
  await page.evaluate(() => {
    window.__ft = []; window.__loaf = []; window.__run = true; let last = performance.now();
    const t0 = performance.now();
    const loop = (t) => { window.__ft.push(t - last); last = t; if (window.__run) requestAnimationFrame(loop); };
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.startTime >= t0) window.__loaf.push(e.duration); })).observe({ type: 'long-animation-frame', buffered: false }); } catch (e) { window.__loaf = null; }
  });
  const y0 = await page.evaluate(() => scrollY);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, delta); await sleep(everyMs); }
  await sleep(600);
  return page.evaluate(({ y0 }) => {
    window.__run = false;
    const ft = window.__ft.slice(2), s = ft.slice().sort((a, b) => a - b), p = (q) => s[Math.min(s.length - 1, Math.floor(s.length * q))];
    const lo = window.__loaf || [];
    return { fotogramas: ft.length, p50_ms: Math.round(p(0.5) * 10) / 10, p95_ms: Math.round(p(0.95) * 10) / 10, max_ms: Math.round(s[s.length - 1] * 10) / 10,
      loaf_50: lo.filter((d) => d > 50).length, loaf_100: lo.filter((d) => d > 100).length, desplazado_px: Math.round(scrollY - y0), loaf_soportado: window.__loaf !== null };
  }, { y0 });
}

async function scrollAll(browser) {
  const out = { escritorio: {}, movil: {} };
  for (const cpu of [1, 4]) {
    { // escritorio: portada
      const { ctx, page, errores } = await newPage(browser, { mobile: false, cpu });
      await page.goto(`${BASE}/#home`, { waitUntil: 'load' }); await introDone(page); await sleep(cpu > 1 ? 4000 : 2500);
      out.escritorio[`cpu${cpu}x`] = { portada: await scrollTest(page) };
      if (errores.length) out.escritorio[`cpu${cpu}x`].errores = errores.slice(0, 5);
      await ctx.close();
    }
    { // móvil: portada, TPS y MIS
      const r = {};
      for (const v of ['home', 'tps', 'mis']) {
        const { ctx, page, errores } = await newPage(browser, { mobile: true, cpu });
        await page.goto(`${BASE}/#${v}`, { waitUntil: 'load' }); await introDone(page); await sleep(cpu > 1 ? 3500 : 2000);
        r[v === 'home' ? 'portada' : v] = await scrollTest(page, 80, 50);
        if (errores.length) r[(v === 'home' ? 'portada' : v) + '_errores'] = errores.slice(0, 5);
        await ctx.close();
      }
      out.movil[`cpu${cpu}x`] = r;
    }
    log('scroll cpu', cpu, 'hecho');
  }
  return out;
}

/* ------------------------------------------------------------------ 3. cambio de vista */
async function viewSwitch(browser, mobile) {
  const { ctx, page, errores } = await newPage(browser, { mobile, cpu: 1 });
  await page.goto(`${BASE}/#home`, { waitUntil: 'load' }); await introDone(page); await sleep(2500);
  const painted = () => page.evaluate(() => new Promise((ok) => {
    const t0 = window.__t0;
    const check = () => {
      // sin límite, una vista que no llega a pintar dejaba la medición colgada
      if (performance.now() - t0 > 10000) return ok(null);
      const v = document.querySelector('.view:not([hidden])');
      // gráficos visibles en pantalla (los de más abajo se dibujan al acercarse)
      const charts = v ? [...v.querySelectorAll('.chart')].filter((c) => { const r = c.getBoundingClientRect(); return r.height > 0 && r.top < innerHeight && r.bottom > 0; }) : [];
      if (v && document.body.dataset.view === window.__want && charts.length && charts.every((c) => c.querySelector('svg'))) {
        requestAnimationFrame(() => requestAnimationFrame(() => ok(Math.round(performance.now() - t0))));
      } else requestAnimationFrame(check);
    };
    check();
  }));
  const res = { tarjeta: {}, pestana: {} };
  for (const v of ['tps', 'mis', 'dss', 'ess']) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(1500);
    await page.evaluate((v) => { window.__want = v; const b = document.querySelector(`.hc[data-card="${v}"]`); window.__t0 = performance.now(); b.click(); }, v);
    res.tarjeta[v] = await painted();
    await sleep(800);
    await page.evaluate(() => document.querySelector('.pagetabs [data-go="home"]').click()); await sleep(1500);   // el logo ahora recarga la web: se vuelve con «Inicio»
  }
  // entre paneles por las pestañas de abajo
  await page.evaluate(() => document.querySelector('.pagetabs [data-go="tps"]').click()); await sleep(1500);
  for (const v of ['mis', 'dss', 'ess', 'tps']) {
    await page.evaluate((v) => { window.__want = v; window.__t0 = performance.now(); document.querySelector(`.pagetabs [data-go="${v}"]`).click(); }, v);
    res.pestana[v] = await painted(); await sleep(700);
  }
  if (errores.length) res.errores = errores.slice(0, 5);
  await ctx.close();
  return res;
}

/* ------------------------------------------------------------------ 4. segunda visita */
async function secondVisit(browser, mobile) {
  const { ctx, page } = await newPage(browser, { mobile, cpu: 1 });
  await page.goto(`${BASE}/#home`, { waitUntil: 'load' }); await introDone(page);
  // espera a que terminen las descargas (fotogramas incluidos)
  await sleep(mobile ? 3000 : 9000);
  const p2 = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p2); await cdp.send('Network.enable');
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, red: true }));
  cdp.on('Network.requestServedFromCache', (e) => { const r = reqs.get(e.requestId); if (r) r.red = false; });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; if (e.response.fromDiskCache || e.response.fromServiceWorker || e.response.fromPrefetchCache) r.red = false; } });
  await p2.goto(`${BASE}/#home`, { waitUntil: 'load' }); await introDone(p2); await sleep(mobile ? 3000 : 9000);
  const all = [...reqs.values()].filter((r) => r.url.startsWith(BASE));
  const hashed = (u) => /\/kit\/|\.[0-9a-f]{8,}\.(js|css|json|woff2)|\/fonts\/|\/art\/|[?&]v=/.test(u);
  const red = all.filter((r) => r.red);
  const out = { peticiones: all.length, a_la_red: red.length, red_kit: red.filter((r) => /\/kit\//.test(r.url)).length,
    red_con_hash: red.filter((r) => hashed(r.url) && !/\/kit\//.test(r.url)).length, revalidadas_304: all.filter((r) => r.status === 304).length,
    detalle_red: red.map((r) => r.url.replace(BASE, '') + (r.status ? ' ' + r.status : '')).slice(0, 12) };
  await ctx.close();
  return out;
}

/* ------------------------------------------------------------------ */
(async () => {
  const result = { fecha: new Date().toISOString(), base: BASE };
  if (!flag('--sin-lighthouse')) {
    log('Lighthouse móvil…'); result.lighthouse = { movil: await lh(`${BASE}/`, 'movil') };
    log('Lighthouse escritorio…'); result.lighthouse.escritorio = await lh(`${BASE}/`, 'escritorio');
    log('Lighthouse', JSON.stringify(result.lighthouse));
  }
  if (!flag('--solo-lighthouse')) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: GPU });
    const blank = await (async () => { const p = await browser.newPage(); await p.setContent('<body></body>'); const f = await p.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else ok(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })); await p.close(); return f; })();
    result.fps_pagina_en_blanco = blank;
    log('scroll…'); result.scroll = await scrollAll(browser);
    log('cambio de vista…'); result.cambio_vista = { escritorio: await viewSwitch(browser, false), movil: await viewSwitch(browser, true) };
    log('segunda visita…'); result.segunda_visita = { escritorio: await secondVisit(browser, false), movil: await secondVisit(browser, true) };
    await browser.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  log('guardado en', OUT);
})();
