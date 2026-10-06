// La versión para Claude (dist/kaidora_artifact.html, todo en un archivo) funciona en escritorio y móvil sin errores.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const DIST = '../dist';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const html = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + fs.readFileSync(`${DIST}/kaidora_artifact.html`, 'utf8') + '</html>';
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (x) => { if (x.type() === 'error') errs.push(x.text()); });
  await p.route('http://dist.test/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/') return r.fulfill({ body: html, contentType: 'text/html' }); const f = DIST + u.pathname; return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: 'image/webp' }) : r.fulfill({ status: 404 }); });
  const res = {};
  for (const v of ['home', 'tps', 'mis', 'dss', 'ess']) { await p.goto('http://dist.test/#' + v); await p.waitForTimeout(2200); res[v] = await p.evaluate(() => document.querySelectorAll('.view:not([hidden]) .tile, .view:not([hidden]) .hc').length); }
  res.kit = await p.evaluate(() => !!document.querySelector('.kit-stage canvas'));
  console.log(w, JSON.stringify(res), errs.length ? errs : 'sin errores');
  await p.close();
}
await b.close();
