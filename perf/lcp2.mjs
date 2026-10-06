// ¿Cuándo cuenta Chrome el LCP del contenido que está bajo la intro? (sin limitar red ni CPU)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const intro of [false, true, false, true]) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript((intro) => { if (!intro) sessionStorage.setItem('kaidora.intro', '1'); window.__l = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__l.push([Math.round(e.startTime), e.size, e.element ? e.element.tagName : '']))).observe({ type: 'largest-contentful-paint', buffered: true }); }, intro);
  await p.goto(process.argv[2]); await p.waitForTimeout(3000);
  console.log(intro ? 'con intro' : 'sin intro', JSON.stringify(await p.evaluate(() => ({ lcp: window.__l, fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) }))));
  await ctx.close();
}
await b.close();
