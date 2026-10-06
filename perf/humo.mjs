// Prueba rápida: la portada y los paneles cargan sin errores en escritorio y móvil; en móvil no hay lienzo ni peticiones a /kit/.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8790';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const [w, h, mob, rm] of [[1440, 900, false, false], [390, 844, true, false], [375, 667, true, false], [1440, 900, false, true], [390, 844, true, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, reducedMotion: rm ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    const errs = [], kit = [], reqs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
    p.on('request', (r) => { reqs.push(r.url().replace(BASE, '')); if (/\/kit\//.test(r.url())) kit.push(r.url()); });
    await p.goto(`${BASE}/#home`); await sleep(3500);
    const home = await p.evaluate(() => ({ canvas: !!document.querySelector('canvas'), kitScene: !!document.querySelector('.kit-scene'), cards: document.querySelectorAll('.hc').length,
      visibles: [...document.querySelectorAll('.hc')].filter((c) => { const r = c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }).length,
      scroll: document.documentElement.scrollHeight - innerHeight, gsap: typeof window.gsap, lenis: document.documentElement.classList.contains('lenis'), intro: !!document.getElementById('intro') }));
    const vistas = {};
    for (const v of ['tps', 'mis', 'dss', 'ess']) { await p.evaluate((v) => { location.hash = v; }, v); await sleep(900); vistas[v] = await p.evaluate(() => document.querySelectorAll('.view:not([hidden]) .tile').length); }
    await p.evaluate(() => { location.hash = 'home'; }); await sleep(1200);
    const vuelta = await p.evaluate(() => ({ cards: document.querySelectorAll('.hc').length, canvas: !!document.querySelector('canvas') }));
    console.log(`${w}x${h}${rm ? ' reducido' : ''}`, JSON.stringify({ home, vistas, vuelta, kit: kit.length, peticiones: reqs.length }), errs.length ? errs.slice(0, 4) : 'sin errores');
    await ctx.close();
  }
  await b.close();
})();
