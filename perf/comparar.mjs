// Compara dos referencias (referencia.mjs): textos idénticos y diferencia de píxeles de las capturas.
// Uso: node comparar.mjs ref_antes ref_despues   → escribe comparacion.json y las imágenes de diferencias en ref_despues/diff_*.png
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [A, B] = [process.argv[2] || 'ref_antes', process.argv[3] || 'ref_despues'];
const out = { textos: {}, capturas: {}, kit: {} };
const ta = JSON.parse(fs.readFileSync(path.join(A, 'textos.json'), 'utf8')), tb = JSON.parse(fs.readFileSync(path.join(B, 'textos.json'), 'utf8'));
for (const k of Object.keys(ta)) out.textos[k] = JSON.stringify(ta[k]) === JSON.stringify(tb[k]) ? 'idéntico' : 'DISTINTO';

function diff(fa, fb, name) {
  const a = PNG.sync.read(fs.readFileSync(fa)), b = PNG.sync.read(fs.readFileSync(fb));
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const crop = (img) => { if (img.width === w && img.height === h) return img.data; const o = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) img.data.copy(o, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4); return o; };
  const d = new PNG({ width: w, height: h });
  // umbral 0,1 (por defecto de pixelmatch): ignora diferencias mínimas de suavizado; includeAA cuenta también los bordes de letra
  const n = pixelmatch(crop(a), crop(b), d.data, w, h, { threshold: 0.1 });
  if (n) fs.writeFileSync(path.join(B, `diff_${name}`), PNG.sync.write(d));
  return { pct: +(100 * n / (w * h)).toFixed(3), tam_antes: `${a.width}×${a.height}`, tam_despues: `${b.width}×${b.height}` };
}
for (const f of fs.readdirSync(A).filter((x) => x.startsWith('vista_') && x.endsWith('.png'))) out.capturas[f] = diff(path.join(A, f), path.join(B, f), f);
for (const f of fs.readdirSync(A).filter((x) => x.startsWith('kit_') && x.endsWith('.png'))) out.kit[f] = diff(path.join(A, f), path.join(B, f), f);
fs.writeFileSync('comparacion.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
