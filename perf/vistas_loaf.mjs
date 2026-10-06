// Tareas largas (long-animation-frame) al montar cada vista y al redimensionar, CPU normal y ×4.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
  for (const cpu of [1, 4]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 3 : 1 });
    const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
    await p.goto(`${BASE}/#tps`); await p.waitForTimeout(3000);
    if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const res = {};
    for (const v of ['mis', 'dss', 'ess', 'tps']) {
      res[v] = await p.evaluate(async (v) => {
        const lo = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => lo.push(Math.round(e.duration)))); po.observe({ type: 'long-animation-frame' });
        document.querySelector(`.pagetabs [data-go="${v}"]`).click();
        await new Promise((r) => setTimeout(r, 1500)); po.disconnect();
        return lo;
      }, v);
    }
    // redimensionado de la ventana (los gráficos se redibujan una vez, al parar)
    res.resize = await p.evaluate(async () => { const lo = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => lo.push(Math.round(e.duration)))); po.observe({ type: 'long-animation-frame' }); await new Promise((r) => setTimeout(r, 1200)); po.disconnect(); return lo; });
    console.log(`${w} cpu${cpu}x`, JSON.stringify(res));
    await ctx.close();
  }
}
await b.close();
