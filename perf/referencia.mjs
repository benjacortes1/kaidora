// Referencia de que nada cambia (paso 0 y verificación):
//  - innerText de las 4 vistas y de las 4 tarjetas de la portada,
//  - capturas de las 4 vistas a 1440×900 y 390×844 (página completa) con prefers-reduced-motion,
//  - capturas de la portada de escritorio (solo el lienzo del kit) al 0, 25, 50, 75 y 100 % de la animación.
// Uso: node referencia.mjs <url-base> <carpeta-salida>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:8790';
const DIR = process.argv[3] || 'ref';
fs.mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
  const textos = {}; const errores = [];
  // 1 y 2: vistas con movimiento reducido (sin contadores ni animaciones)
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${w} ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errores.push(`${w} ${m.text()}`); });
    for (const v of ['home', 'tps', 'mis', 'dss', 'ess']) {
      await page.goto(`${BASE}/#${v}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await sleep(1800);
      // recorre la página (los gráficos de abajo se dibujan al acercarse) y vuelve arriba
      await page.evaluate(async () => { const st = (ms) => new Promise((r) => setTimeout(r, ms)); for (let y = 0; y <= document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await st(60); } window.scrollTo(0, 0); await st(400); });
      if (v === 'home') {
        textos[`tarjetas_${w}`] = await page.evaluate(() => [...document.querySelectorAll('.hc')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()));
      } else {
        textos[`${v}_${w}`] = await page.evaluate(() => document.querySelector('.view:not([hidden])').innerText.replace(/[ \t]+/g, ' ').trim());
        await page.screenshot({ path: path.join(DIR, `vista_${v}_${w}.png`), fullPage: true });
      }
    }
    await ctx.close();
  }
  // 3: portada de escritorio, fotogramas del kit por progreso de la animación
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`portada ${e.message}`));
    await page.goto(`${BASE}/#home`, { waitUntil: 'load' });
    await page.waitForFunction(() => !document.getElementById('intro') || +getComputedStyle(document.getElementById('intro')).opacity === 0, null, { timeout: 20000 }).catch(() => {});
    await sleep(9000);   // todos los fotogramas descargados
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      // la animación va de scrollY = 0 (el espaciador asoma por abajo) a scrollY = alto del espaciador
      await page.evaluate((p) => { const sp = document.querySelector('.kit-spacer'); window.scrollTo(0, Math.round(sp.offsetHeight * p)); }, p);
      await sleep(1600);
      const canvas = await page.$('.kit-stage canvas');
      await canvas.screenshot({ path: path.join(DIR, `kit_${Math.round(p * 100)}.png`) });
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(DIR, 'textos.json'), JSON.stringify(textos, null, 1));
  fs.writeFileSync(path.join(DIR, 'errores.json'), JSON.stringify(errores, null, 1));
  console.log('referencia guardada en', DIR, '· errores:', errores.length);
  await browser.close();
})();
