// Uso: node datos/generar_previas.js (necesita playwright-core y Chrome instalado).
// Genera src/assets/og.jpg (vista previa al compartir, 1200×630) y src/assets/apple-touch-icon.png (180×180) con el kit y el logo.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const kit = 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'src/assets/kit/a_191.webp')).toString('base64');
const K = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b9bff"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#1636a8"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#a)"/><g fill="none" stroke-linecap="round" stroke-width="5.4"><path d="M17 13v22" stroke="#fff"/><path d="M31.5 13 19.6 24.6" stroke="#fff"/><path d="M23.2 21.1 32 35" stroke="#b9d3ff"/></g></svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=block"><style>
    html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(70% 90% at 72% 55%,#1b3a78 0%,#0b1b3a 55%,#060f24 100%);font-family:Inter,system-ui,sans-serif;color:#fff}
    .kit{position:absolute;right:-90px;top:20px;width:860px;height:auto;-webkit-mask-image:radial-gradient(60% 62% at 55% 52%,#000 62%,transparent 100%);mask-image:radial-gradient(60% 62% at 55% 52%,#000 62%,transparent 100%)}
    .t{position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:22px;width:620px}
    .brand{display:flex;align-items:center;gap:20px}.brand b{font-size:68px;font-weight:800;letter-spacing:-.05em}
    .sub{font-size:28px;white-space:nowrap;font-weight:500;color:#c7d7f5;letter-spacing:-.01em;line-height:1.3}
    .chips{display:flex;gap:10px}.chips span{font-size:22px;font-weight:800;padding:8px 16px;border-radius:12px;background:#1d4ed8}
    .chips span:nth-child(2){background:#2563eb}.chips span:nth-child(3){background:#3b82f6}.chips span:nth-child(4){background:#bfdbfe;color:#06122b}
  </style></head><body><img class="kit" src="${kit}"><div class="t"><div class="brand">${K(84)}<b>Kaidora</b></div><div class="sub">Panel de gestión del kit de salud personal</div><div class="chips"><span>TPS</span><span>MIS</span><span>DSS</span><span>ESS</span></div></div></body></html>`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(ROOT, 'src/assets/og.jpg'), type: 'jpeg', quality: 86 });
  const i = await b.newPage({ viewport: { width: 180, height: 180 } });
  // icono a sangre (iOS redondea las esquinas por su cuenta)
  await i.setContent(`<html><body style="margin:0"><svg width="180" height="180" viewBox="0 0 48 48"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b9bff"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#1636a8"/></linearGradient></defs><rect width="48" height="48" fill="url(#a)"/><g fill="none" stroke-linecap="round" stroke-width="5.4" transform="translate(24 24) scale(.82) translate(-24 -24)"><path d="M17 13v22" stroke="#fff"/><path d="M31.5 13 19.6 24.6" stroke="#fff"/><path d="M23.2 21.1 32 35" stroke="#b9d3ff"/></g></svg></body></html>`);
  await i.screenshot({ path: path.join(ROOT, 'src/assets/apple-touch-icon.png') });
  await b.close();
})();
