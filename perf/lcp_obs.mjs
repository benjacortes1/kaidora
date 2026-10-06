// Qué entradas LCP emite la portada móvil y si la hidratación reutiliza el HTML ya escrito (o lo vuelve a montar).
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'https://kaidoraspain.netlify.app/';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__lcp = []; window.__mut = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: Math.round(e.startTime), el: e.element ? e.element.outerHTML.slice(0, 60) : null, size: e.size }))).observe({ type: 'largest-contentful-paint', buffered: true });
  document.addEventListener('DOMContentLoaded', () => {
    const v = document.getElementById('view-home'); if (!v) return;
    window.__img0 = v.querySelector('img');
    new MutationObserver((ms) => ms.forEach((m) => window.__mut.push({ t: Math.round(performance.now()), tipo: m.type, attr: m.attributeName, añadidos: m.addedNodes.length, quitados: m.removedNodes.length }))).observe(v, { childList: true, attributes: true, subtree: false });
  });
});
await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(() => ({ lcp: window.__lcp, mutaciones: window.__mut, misma_img: window.__img0 === document.querySelector('#view-home img'), data_pre: document.getElementById('view-home').getAttribute('data-pre'), clases: document.getElementById('view-home').firstElementChild && document.getElementById('view-home').firstElementChild.className })), null, 1));
await b.close();
