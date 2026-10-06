import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8790/#home'); await p.waitForTimeout(2500);
await p.goto('http://localhost:8790/#tps'); await p.waitForTimeout(1500);
let recargas = 0; p.on('load', () => recargas++);
await p.evaluate(() => document.querySelector('.pagetabs [data-go="home"]').click()); await p.waitForTimeout(2000);
console.log(JSON.stringify({ recargas, vista: await p.evaluate(() => document.body.dataset.view), scrollY: await p.evaluate(() => Math.round(scrollY)), errs }));
await b.close();
