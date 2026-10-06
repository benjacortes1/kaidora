// Recodifica los fotogramas del kit a WebP calidad 72 (libwebp 1.6 con esfuerzo máximo), desde los originales.
// Los originales (calidad 82, codificador del navegador) se conservan en src/assets/kit_original/ y no se publican.
// Diferencia medida frente a los originales: PSNR ~44 dB (imperceptible); tamaño −26 % (6,25 → ~4,5 MB).
// Uso (desde kaidora/perf):  node recodificar_kit.mjs        Para volver a los originales: copiar kit_original/ sobre kit/.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const QUALITY = 72;
const ORIG = path.resolve('../src/assets/kit_original');
const DEST = path.resolve('../src/assets/kit');
if (!fs.existsSync(ORIG)) { fs.cpSync(DEST, ORIG, { recursive: true }); console.log('originales guardados en', ORIG); }
let a = 0, b = 0;
for (const f of fs.readdirSync(ORIG).filter((x) => x.endsWith('.webp')).sort()) {
  const src = fs.readFileSync(path.join(ORIG, f));
  const out = await sharp(src).webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toBuffer();
  fs.writeFileSync(path.join(DEST, f), out);
  a += src.length; b += out.length;
}
console.log(`fotogramas: ${(a / 1048576).toFixed(2)} MB → ${(b / 1048576).toFixed(2)} MB (calidad ${QUALITY})`);
