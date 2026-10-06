// Tiempos observados (sin simular) de una ejecución de Lighthouse móvil y tareas del hilo principal antes del LCP. Navegador caliente.
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
const url = process.argv[2];
const chrome = await chromeLauncher.launch({ chromePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', chromeFlags: ['--headless=new'] });
let r;
for (let i = 0; i < 2; i++) r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] });
await chrome.kill();
const a = r.lhr.audits, m = a.metrics.details.items[0];
console.log('simulado: FCP', Math.round(m.firstContentfulPaint), 'LCP', Math.round(m.largestContentfulPaint));
console.log('observado: FP', m.observedFirstPaint, 'FCP', m.observedFirstContentfulPaint, 'LCP', m.observedLargestContentfulPaint, 'DCL', m.observedDomContentLoaded, 'load', m.observedLoad);
const t = a['main-thread-tasks'].details.items.filter((x) => x.startTime < m.observedLargestContentfulPaint + 5);
console.log('tareas antes del LCP observado:', t.length, 'suma', Math.round(t.reduce((s, x) => s + x.duration, 0)), 'ms');
t.filter((x) => x.duration > 3).forEach((x) => console.log('  ', Math.round(x.startTime), Math.round(x.duration)));
const bt = a['bootup-time'].details.items; bt.forEach((x) => console.log('  JS', x.url.replace(/^https?:\/\/[^/]+/, ''), 'total', Math.round(x.total), 'script', Math.round(x.scripting)));
