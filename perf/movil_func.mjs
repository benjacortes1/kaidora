// Portada móvil con la aplicación cargada tras el pintado: hidratación, tarjetas, enlaces directos y toque temprano.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const out = {};
const nueva = async (opts = {}) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, ...opts }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); return { ctx, p, errs }; };
{ // portada → hidrata → tarjeta TPS abre el panel
  const { ctx, p, errs } = await nueva();
  await p.goto(`${BASE}/`); await p.waitForFunction(() => !document.querySelector('#view-home[data-pre]'), null, { timeout: 8000 });
  out.hidratada_ms = await p.evaluate(() => Math.round(performance.now()));
  out.misma_portada = await p.evaluate(() => document.querySelectorAll('#view-home .hc').length);
  await p.waitForTimeout(1200);
  await p.tap('.hc[data-card="tps"]'); await p.waitForTimeout(1500);
  out.tarjeta_tps = await p.evaluate(() => ({ vista: document.body.dataset.view, hash: location.hash, graficos: document.querySelectorAll('.view:not([hidden]) .chart svg').length }));
  await p.click('.brand'); await p.waitForTimeout(1000);
  out.vuelta_portada = await p.evaluate(() => ({ vista: document.body.dataset.view, tarjetas: document.querySelectorAll('#view-home .hc').length }));
  out.errores_portada = errs; await ctx.close();
}
{ // enlace directo a un panel
  const { ctx, p, errs } = await nueva();
  await p.goto(`${BASE}/#mis`); await p.waitForTimeout(2500);
  out.enlace_mis = await p.evaluate(() => ({ vista: document.body.dataset.view, graficos: document.querySelectorAll('.view:not([hidden]) .chart svg').length }));
  out.errores_enlace = errs; await ctx.close();
}
{ // toque muy temprano (antes de que llegue la aplicación): la pide en el acto
  const { ctx, p, errs } = await nueva();
  await p.goto(`${BASE}/`, { waitUntil: 'commit' }); await p.waitForSelector('.hc');
  await p.touchscreen.tap(195, 600);
  await p.waitForFunction(() => !document.querySelector('#view-home[data-pre]'), null, { timeout: 8000 }).catch(() => {});
  out.toque_temprano = await p.evaluate(() => ({ app_pedida: !!document.querySelector('script[src*="assets/app."]'), hidratada: !document.querySelector('#view-home[data-pre]') }));
  out.errores_toque = errs; await ctx.close();
}
{ // escritorio: la aplicación se inserta enseguida
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/#home`); await p.waitForTimeout(3000);
  out.escritorio = await p.evaluate(() => ({ canvas: !!document.querySelector('.kit-stage canvas'), tarjetas: document.querySelectorAll('#view-home .hc').length, app_insertada_ms: Math.round((performance.getEntriesByType('resource').find((r) => /assets\/app\./.test(r.name)) || {}).startTime || -1) }));
  out.errores_escritorio = errs; await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
