import { chromium } from 'playwright-core';
const BASE = process.argv[2];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const k of [1, 2, 3]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${BASE}/#tps`); await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => {
    const lo = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => lo.push({ dur: Math.round(e.duration), script: Math.round(e.scripts.reduce((a, s) => a + s.duration, 0)), render: Math.round(e.startTime + e.duration - e.renderStart), styleLayout: e.styleAndLayoutStart ? Math.round(e.startTime + e.duration - e.styleAndLayoutStart) : 0, block: Math.round(e.blockingDuration) })));
    po.observe({ type: 'long-animation-frame' });
    document.querySelector('.pagetabs [data-go="mis"]').click();
    await new Promise((r) => setTimeout(r, 1500)); po.disconnect(); return lo;
  });
  console.log(BASE.slice(-4), k, JSON.stringify(r));
  await p.close();
}
await b.close();
