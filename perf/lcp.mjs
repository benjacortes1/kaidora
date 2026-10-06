// Candidatos LCP observados en el navegador (sin simulación): elemento, tamaño y momento.
import { chromium } from 'playwright-core';
const url = process.argv[2], mob = process.argv[3] !== 'escritorio';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await b.newContext(mob ? { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true } : { viewport: { width: 1350, height: 940 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
await p.addInitScript(() => { window.__lcp = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: Math.round(e.startTime), size: e.size, el: e.element ? (e.element.tagName + '.' + (e.element.className || '') + ' «' + (e.element.textContent || '').trim().slice(0, 20) + '»') : (e.url || '').slice(-30) }))).observe({ type: 'largest-contentful-paint', buffered: true }); });
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(6000);
console.log(JSON.stringify(await p.evaluate(() => ({ lcp: window.__lcp, fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0) })), null, 1));
await b.close();
