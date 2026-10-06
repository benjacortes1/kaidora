// Tocar el logo de arriba a la izquierda: recarga la portada con la intro (1 s) y el kit desde arriba.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};
const estado = (p) => p.evaluate(() => { const i = document.getElementById('intro'), k = window.__kaidora && window.__kaidora.KitSeq;
  return { url: location.pathname + location.search + location.hash, vista: document.body.dataset.view, scrollY: Math.round(scrollY), intro: !!i && getComputedStyle(i).display !== 'none' && +getComputedStyle(i).opacity > 0.05,
    canvas: !!document.querySelector('.kit-stage canvas'), fotograma: k ? k.shownI : null, tarjetas: document.querySelectorAll('#view-home .hc').length }; });
for (const [nom, opts] of [['escritorio', { viewport: { width: 1440, height: 900 } }], ['movil', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const r = {};
  // primera visita, luego a un panel y desde ahí el logo
  await p.goto(`${BASE}/?perfdebug#home`); await p.waitForTimeout(2500);
  r.segunda_carga_sin_intro = await (async () => { await p.goto(`${BASE}/?perfdebug#tps`); await p.waitForTimeout(400); return (await estado(p)).intro; })();
  await p.waitForTimeout(1500);
  await Promise.all([p.waitForEvent('load'), p.click('.brand')]);
  await p.waitForTimeout(250); r.tras_logo_250ms = await estado(p);
  await p.waitForTimeout(1500); r.tras_logo_1750ms = await estado(p);
  // desde la portada con scroll hasta las tarjetas (solo escritorio tiene kit)
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1200);
  r.antes_logo_abajo = (await estado(p)).scrollY;
  await Promise.all([p.waitForEvent('load'), p.click('.brand')]);
  await p.waitForTimeout(250); r.abajo_tras_logo_250ms = await estado(p);
  await p.waitForTimeout(1500); r.abajo_tras_logo_1750ms = await estado(p);
  r.errores = errs; out[nom] = r; await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
