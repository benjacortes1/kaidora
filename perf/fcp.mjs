// FP / FCP / LCP observados con red 4G lenta y CPU ×4, con y sin la intro (sessionStorage).
import { chromium } from 'playwright-core';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const intro of [true, true, true]) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await p.addInitScript((intro) => { if (!intro) sessionStorage.setItem('kaidora.intro', '1'); window.__lcp = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push([Math.round(e.startTime), e.size, e.element ? e.element.tagName + '.' + e.element.className : e.url]))).observe({ type: 'largest-contentful-paint', buffered: true }); }, intro);
  await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
  console.log(intro ? 'con intro' : 'sin intro', JSON.stringify(await p.evaluate(() => ({ paint: performance.getEntriesByType('paint').map((e) => [e.name, Math.round(e.startTime)]), lcp: window.__lcp, html: Math.round(performance.getEntriesByType('navigation')[0].responseEnd), dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) }))));
  await ctx.close();
}
await b.close();
