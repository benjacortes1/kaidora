// Scroll muy rápido en la portada de escritorio: fotogramas que muestran uno cercano en lugar del exacto (saltos).
// En la versión de antes (sin ?perfdebug) se expone KitSeq reescribiendo su declaración al servir la página.
import { chromium } from 'playwright-core';
const BASE = process.argv[2], N = +(process.argv[3] || 3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const res = [];
for (let k = 0; k < N; k++) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.route((u) => u.pathname === '/', async (route) => { const r = await route.fetch(); route.fulfill({ response: r, body: (await r.text()).replace('const KitSeq = {', 'const KitSeq = window.__KS = {') }); });
  await p.goto(`${BASE}/?perfdebug#home`); await sleep(8000);
  await p.evaluate(() => { const k = window.__KS || window.__kaidora.KitSeq; window.__k = k; window.__sub = 0; window.__gap = 0; window.__gaps = []; window.__n = 0; window.__run = true;
    const loop = () => { if (k.shownI >= 0) { window.__n++; const d = Math.abs(k.shownI - k.want); if (d > 0) { window.__sub++; window.__gaps.push(d); window.__gap = Math.max(window.__gap, d); } } if (window.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, 160); await sleep(16); }
  await sleep(500);
  for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, -160); await sleep(16); }
  await sleep(800);
  res.push(await p.evaluate(() => { window.__run = false; const g = window.__gaps.sort((a, b) => a - b); return { n: window.__n, sustitutos: window.__sub, salto_max: window.__gap, salto_p90: g[Math.floor(g.length * 0.9)] || 0, mas_de_4: g.filter((x) => x > 4).length }; }));
  await p.close();
}
console.log(BASE, JSON.stringify(res));
await b.close();
