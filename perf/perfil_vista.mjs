// Perfil de CPU al montar una vista (primera vez): funciones con más tiempo inclusivo.
import { chromium } from 'playwright-core';
const [BASE, V] = [process.argv[2], process.argv[3] || 'mis'];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`${BASE}/?perfdebug#tps`); await p.waitForTimeout(3000);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
await p.evaluate((v) => document.querySelector(`.pagetabs [data-go="${v}"]`).click(), V); await p.waitForTimeout(1200);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n])), parent = new Map(); profile.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
const selfT = new Map(); let i = 0; for (const s of profile.samples) selfT.set(s, (selfT.get(s) || 0) + (profile.timeDeltas[i++] || 0));
const incl = new Map(), self = new Map();
for (const [id, t] of selfT) { const n = byId.get(id); const k0 = (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber; self.set(k0, (self.get(k0) || 0) + t); const seen = new Set(); let cur = id; while (cur != null) { const nn = byId.get(cur), k = (nn.callFrame.functionName || '(anon)') + ':' + nn.callFrame.lineNumber; if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + t); } cur = parent.get(cur); } }
console.log('inclusivo:', [...incl.entries()].filter(([k]) => !/root|idle|program/.test(k)).sort((a, c) => c[1] - a[1]).slice(0, 18).map(([k, v]) => `${k} ${(v / 1000).toFixed(0)}`).join(' | '));
console.log('propio:', [...self.entries()].filter(([k]) => !/root|idle|program|garbage/.test(k)).sort((a, c) => c[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${(v / 1000).toFixed(0)}`).join(' | '));
await b.close();
