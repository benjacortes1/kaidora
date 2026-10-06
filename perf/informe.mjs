// Genera perf/INFORME.md (tabla antes/después) a partir de antes.json, despues.json, produccion.json y comparacion.json.
import fs from 'node:fs';
const J = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const A = J('antes.json'), D = J('despues.json'), P = J('produccion.json'), C = J('comparacion.json'), V = J('verificacion.json');
const ms = (v) => (v == null ? '—' : v >= 1000 ? (v / 1000).toFixed(2).replace('.', ',') + ' s' : Math.round(v) + ' ms');
const kb = (v) => (v == null ? '—' : v >= 1024 ? (v / 1024).toFixed(2).replace('.', ',') + ' MB' : v + ' KB');
const n = (v) => (v == null ? '—' : String(v).replace('.', ','));
const rows = [];
const add = (m, f, fmt, prod = true) => rows.push(`| ${m} | ${prod && P ? fmt(f(P)) : '—'} | ${fmt(f(A))} | ${fmt(f(D))} |`);
const L = (o, form, k) => (o && o.lighthouse && o.lighthouse[form] ? o.lighthouse[form][k] : null);
for (const [form, nom] of [['movil', 'Móvil'], ['escritorio', 'Escritorio']]) {
  add(`${nom} · Lighthouse (puntuación)`, (o) => L(o, form, 'puntuacion'), n);
  add(`${nom} · LCP`, (o) => L(o, form, 'lcp_ms'), ms);
  add(`${nom} · FCP`, (o) => L(o, form, 'fcp_ms'), ms);
  add(`${nom} · TBT`, (o) => L(o, form, 'tbt_ms'), ms);
  add(`${nom} · CLS`, (o) => L(o, form, 'cls'), n);
  add(`${nom} · bytes transferidos (primera carga)`, (o) => L(o, form, 'bytes_kb'), kb);
  add(`${nom} · peticiones (de ellas a /kit/)`, (o) => (L(o, form, 'peticiones') == null ? null : `${L(o, form, 'peticiones')} (${L(o, form, 'peticiones_kit')})`), (x) => x || '—');
}
const S = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const sc = (label, path) => {
  for (const cpu of ['cpu1x', 'cpu4x']) {
    const f = (o) => S(o, `scroll.${path.replace('CPU', cpu)}`);
    rows.push(`| ${label} · CPU ${cpu === 'cpu1x' ? 'normal' : '4× más lenta'} · p50 / p95 / máx | — | ${fmtS(f(A))} | ${fmtS(f(D))} |`);
    rows.push(`| ${label} · CPU ${cpu === 'cpu1x' ? 'normal' : '4×'} · fotogramas > 50 ms / > 100 ms | — | ${fmtL(f(A))} | ${fmtL(f(D))} |`);
  }
};
const fmtS = (r) => (r ? `${n(r.p50_ms)} / ${n(r.p95_ms)} / ${n(r.max_ms)} ms` : '—');
const fmtL = (r) => (r ? `${r.loaf_50} / ${r.loaf_100}` : '—');
sc('Scroll portada escritorio (1440×900)', 'escritorio.CPU.portada');
sc('Scroll portada móvil (390×844)', 'movil.CPU.portada');
sc('Scroll TPS móvil', 'movil.CPU.tps');
sc('Scroll MIS móvil', 'movil.CPU.mis');
for (const [k, nom] of [['escritorio', 'escritorio'], ['movil', 'móvil']]) {
  for (const [t, tn] of [['tarjeta', 'desde la tarjeta de la portada'], ['pestana', 'desde la pestaña inferior']]) {
    const f = (o) => S(o, `cambio_vista.${k}.${t}`);
    const fmt = (r) => (r ? ['tps', 'mis', 'dss', 'ess'].map((v) => `${v.toUpperCase()} ${r[v]}`).join(' · ') + ' ms' : '—');
    rows.push(`| Cambio de vista (${nom}, ${tn}) | — | ${fmt(f(A))} | ${fmt(f(D))} |`);
  }
}
for (const [k, nom] of [['escritorio', 'escritorio'], ['movil', 'móvil']]) {
  const f = (o) => S(o, `segunda_visita.${k}`);
  const fmt = (r) => (r ? `${r.a_la_red} a la red (/kit/: ${r.red_kit}; con huella: ${r.red_con_hash}; 304: ${r.revalidadas_304})` : '—');
  rows.push(`| Segunda visita (${nom}) | — | ${fmt(f(A))} | ${fmt(f(D))} |`);
}
let md = `# Kaidora · rendimiento antes / después

Medido el ${new Date().toISOString().slice(0, 10)} en local con \`tools/servidor.mjs\` (brotli + \`_headers\`, como Netlify), Chrome ${'headless'}.
Lighthouse: mediana de 3 ejecuciones, simulación de móvil (4G lenta, CPU ×4) y de escritorio; navegador ya arrancado y caché vacía.
Producción (https://kaidoraspain.netlify.app, versión anterior publicada) solo como referencia.
Scroll: rueda en pasos regulares durante ~4 s; duración de cada fotograma (requestAnimationFrame) y long-animation-frames.
El techo de esta máquina en headless es 60 Hz (16,7 ms por fotograma).

| Métrica | Producción (ref.) | Antes (local) | Después (local) |
|---|---|---|---|
${rows.join('\n')}
`;
if (C) {
  md += `\n## Nada ha cambiado\n\n| Comprobación | Resultado |\n|---|---|\n`;
  for (const [k, v] of Object.entries(C.textos)) md += `| innerText ${k} | ${v} |\n`;
  for (const [k, v] of Object.entries(C.capturas)) md += `| ${k} | ${n(v.pct)} % de píxeles distintos (${v.tam_antes} → ${v.tam_despues}) |\n`;
  for (const [k, v] of Object.entries(C.kit)) md += `| portada escritorio ${k.replace('kit_', '').replace('.png', '')} % | ${n(v.pct)} % de píxeles distintos |\n`;
}
if (V) md += `\n## Verificaciones\n\n\`\`\`json\n${JSON.stringify(V, null, 1)}\n\`\`\`\n`;
fs.writeFileSync('INFORME.md', md);
console.log(md);
