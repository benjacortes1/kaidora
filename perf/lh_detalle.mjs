// Detalle de una ejecución de Lighthouse: elemento LCP, fases del LCP y peticiones con su tamaño transferido.
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
const url = process.argv[2], form = process.argv[3] || 'movil';
const chrome = await chromeLauncher.launch({ chromePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', chromeFlags: ['--headless=new'] });
const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] }, form === 'escritorio' ? desktopConfig : undefined);
await chrome.kill();
const a = r.lhr.audits;
console.log('LCP', Math.round(a['largest-contentful-paint'].numericValue), 'FCP', Math.round(a['first-contentful-paint'].numericValue), 'TBT', Math.round(a['total-blocking-time'].numericValue));
const el = a['largest-contentful-paint-element'];
for (const it of (el.details.items || [])) {
  if (it.type === 'table') it.items.forEach((x) => console.log(' ', JSON.stringify(x).slice(0, 300)));
  else console.log(' ', JSON.stringify(it).slice(0, 300));
}
const items = a['network-requests'].details.items;
items.forEach((i) => console.log(String(Math.round(i.transferSize / 1024)).padStart(5), 'KB', String(Math.round(i.networkRequestTime || i.startTime || 0)).padStart(6), String(Math.round(i.networkEndTime || i.endTime || 0)).padStart(6), i.priority || '', i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 70)));
