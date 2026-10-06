// Prueba de recodificación de los fotogramas del kit: tamaño y diferencia (PSNR) frente a los actuales.
import sharp from 'sharp';
import fs from 'node:fs';
const DIR = '../src/assets/kit';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.webp')).filter((_, i) => i % 16 === 0);
const psnr = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } const mse = s / a.length; return mse ? 10 * Math.log10(255 * 255 / mse) : 99; };
for (const q of [75, 72, 70]) {
  let orig = 0, nuevo = 0, ps = [];
  for (const f of files) {
    const src = fs.readFileSync(`${DIR}/${f}`);
    const ref = await sharp(src).removeAlpha().raw().toBuffer();
    const out = await sharp(src).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer();
    const dec = await sharp(out).removeAlpha().raw().toBuffer();
    orig += src.length; nuevo += out.length; ps.push(psnr(ref, dec));
    if (q === 75 && f === 'a_096.webp') fs.writeFileSync('muestra_q75_a096.webp', out);
  }
  console.log(`q${q}: ${Math.round(orig / 1024)} KB → ${Math.round(nuevo / 1024)} KB (−${Math.round(100 - nuevo / orig * 100)} %) · PSNR medio ${(ps.reduce((a, c) => a + c) / ps.length).toFixed(1)} dB · mín ${Math.min(...ps).toFixed(1)} dB · total estimado ${(6251 * nuevo / orig / 1024).toFixed(2)} MB`);
}
