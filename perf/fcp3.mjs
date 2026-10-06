// Qué parte de la intro retrasa el primer pintado (sin limitar red ni CPU).
import { chromium } from 'playwright-core';
const V = {
  normal: '',
  sin_anim_intro: '.intro, .intro * { animation: none !important; }',
  sin_anim_salida: '.intro { animation: none !important; }',
  sin_anim_hijos: '.intro * { animation: none !important; }',
  sin_letras_anim: '.intro-word span { animation: none !important; }',
  sin_logo_anim: '.intro .logo, .intro .logo path { animation: none !important; }',
  sin_glow_anim: '.intro-glow { animation: none !important; }',
  sin_mark_anim: '.intro-mark { animation: none !important; }',
  palabra_entera: '.intro-word span { animation: none !important; } .intro-word { animation: introLetter calc(.42 * var(--t)) cubic-bezier(.16, 1, .3, 1) calc(.22 * var(--t)) both; }',
  sin_trazo: '.intro .logo path { animation: none !important; stroke-dashoffset: 0 !important; }',
};
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [name, css] of Object.entries(V)) {
 const fps = [];
 for (let k = 0; k < 3; k++) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.route((u) => u.pathname === '/', async (route) => { const r = await route.fetch(); route.fulfill({ response: r, body: (await r.text()).replace('</style>', css + '</style>') }); });
  await p.goto(process.argv[2]); await p.waitForTimeout(2500);
  fps.push((await p.evaluate(() => Math.round(performance.getEntriesByType('paint')[0]?.startTime || -1))));
  await ctx.close();
 }
 console.log(name.padEnd(18), JSON.stringify(fps), 'mediana', fps.sort((a, b) => a - b)[1]);
}
await b.close();
