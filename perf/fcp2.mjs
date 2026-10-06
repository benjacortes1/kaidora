// Variantes de la intro para encontrar qué retrasa el primer pintado (red 4G lenta, CPU ×4).
import { chromium } from 'playwright-core';
const url = process.argv[2];
const variants = {
  normal: (h) => h,
  sin_anim: (h) => h.replace('</style>', '.intro, .intro * { animation: none !important; }</style>'),
  sin_precarga_fuente: (h) => h.replace(/<link rel="preload" href="fonts[^>]*>/, ''),
  sin_letras: (h) => h.replace(/<span class="intro-word">.*?<\/span><\/span>/, ''),
  sin_app: (h) => h.replace(/<script defer src="assets\/app[^>]*><\/script>/, ''),
  sin_preload_datos: (h) => h.replace(/<link rel="preload" href="assets\/data[^>]*>/, ''),
};
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [name, fn] of Object.entries(variants)) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.route((u) => u.pathname === '/', async (route) => { const r = await route.fetch(); route.fulfill({ response: r, body: fn(await r.text()) }); });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  console.log(name.padEnd(20), JSON.stringify(await p.evaluate(() => ({ paint: performance.getEntriesByType('paint').map((e) => Math.round(e.startTime)), dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) }))));
  await ctx.close();
}
await b.close();
