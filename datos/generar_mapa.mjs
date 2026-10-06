// Genera src/mapa_espana.json: trazados SVG ya proyectados de las comunidades autónomas.
// Fuente: es-atlas (MIT) con geometrías del Instituto Geográfico Nacional (IGN, CC BY 4.0).
// Proyección cónica conforme de España (d3-composite-projections, BSD-3). Canarias no se dibuja: el mapa se ajusta a la
// Península, Baleares, Ceuta y Melilla para ganar tamaño (sus datos siguen en la tabla y en los filtros).
// Uso (en una carpeta con: npm i es-atlas@0.6.0 d3-geo@3 d3-composite-projections@2 topojson-client@3):
//   node generar_mapa.mjs <ruta de salida .json>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const topo = require('es-atlas/es/autonomous_regions.json');
const { feature } = require('topojson-client');
const d3 = require('d3-geo');
// el paquete publica un UMD dentro de un módulo ESM: se evalúa como CommonJS
const umd = fs.readFileSync(require.resolve('d3-composite-projections/d3-composite-projections.js'), 'utf8');
const cp = {}; new Function('exports', 'require', 'module', umd)(cp, require, { exports: cp });
const { geoConicConformalSpain } = cp;

const IDS = { '01': 'AND', '02': 'ARA', '03': 'AST', '04': 'BAL', '05': 'CAN', '06': 'CNT', '07': 'CYL', '08': 'CLM', '09': 'CAT', '10': 'VAL',
  '11': 'EXT', '12': 'GAL', '13': 'MAD', '14': 'MUR', '15': 'NAV', '16': 'PVA', '17': 'RIO', '18': 'CEU', '19': 'MEL' };
const SIN = ['05'];   // Canarias
const W = 600, H = 500;
const fc = feature(topo, topo.objects.autonomous_regions);
fc.features = fc.features.filter((f) => IDS[f.id] && !SIN.includes(f.id));
const proj = geoConicConformalSpain().fitExtent([[6, 6], [W - 6, H - 6]], fc);
const path = d3.geoPath(proj).digits(1);
const round = (p) => p.map((v) => Math.round(v * 10) / 10);

// punto de etiqueta: centroide del polígono más grande de cada comunidad
function labelPoint(f) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  let best = null, bestA = -1;
  polys.forEach((c) => { const g = { type: 'Polygon', coordinates: c }; const a = path.area(g); if (a > bestA) { bestA = a; best = g; } });
  return round(path.centroid(best));
}
const regions = fc.features.map((f) => ({ id: IDS[f.id], d: path(f), c: labelPoint(f), area: Math.round(path.area(f)) }));
const out = { w: W, h: H, frame: '', regions,
  fuente: 'Geometrías © Instituto Geográfico Nacional (IGN), CC BY 4.0, vía es-atlas (MIT).' };
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log('OK', regions.length, 'regiones,', Math.round(JSON.stringify(out).length / 1024), 'KB');
regions.forEach((r) => console.log(r.id, r.area, r.c.join(',')));
