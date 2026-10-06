// Servidor estático local que se comporta como Netlify para medir rendimiento:
// - comprime con brotli (o gzip) los archivos de texto,
// - aplica las cabeceras de `_headers` (mismo formato que Netlify) y, si no hay, `Cache-Control: public, max-age=0, must-revalidate`,
// - responde 304 a las revalidaciones (ETag).
// Uso: node tools/servidor.mjs <carpeta> <puerto>     p. ej.  node tools/servidor.mjs web 8790
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT = path.resolve(process.argv[2] || 'web');
const PORT = +(process.argv[3] || 8790);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const TEXT = /^(text\/|application\/json|image\/svg)/;

// reglas de _headers: [{ re, headers: [[nombre, valor]] }]
function readRules() {
  const f = path.join(ROOT, '_headers');
  if (!fs.existsSync(f)) return [];
  const rules = []; let cur = null;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const pat = line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      cur = { re: new RegExp('^' + pat + '$'), headers: [] }; rules.push(cur);
    } else if (cur) {
      const i = line.indexOf(':'); if (i > 0) cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

const cache = new Map();   // ruta → { buf, br, gz, etag, mtime }
function load(file) {
  const st = fs.statSync(file);
  const c = cache.get(file);
  if (c && c.mtime === st.mtimeMs) return c;
  const buf = fs.readFileSync(file);
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const e = { buf, type, mtime: st.mtimeMs, etag: '"' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '"' };
  if (TEXT.test(type)) {
    e.br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
    e.gz = zlib.gzipSync(buf, { level: 9 });
  }
  cache.set(file, e);
  return e;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404'); return; }
  const e = load(file);
  const headers = { 'Content-Type': e.type, ETag: e.etag, Vary: 'Accept-Encoding' };
  let cc = 'public, max-age=0, must-revalidate';
  for (const r of readRules()) {
    if (r.re.test(url.pathname) || (url.pathname.endsWith('/') && r.re.test(url.pathname + 'index.html'))) {
      for (const [k, v] of r.headers) { if (k.toLowerCase() === 'cache-control') cc = v; else headers[k] = v; }
    }
  }
  headers['Cache-Control'] = cc;
  if (req.headers['if-none-match'] === e.etag) { res.writeHead(304, headers); res.end(); return; }
  const ae = req.headers['accept-encoding'] || '';
  let body = e.buf;
  if (e.br && /\bbr\b/.test(ae)) { body = e.br; headers['Content-Encoding'] = 'br'; } else if (e.gz && /\bgzip\b/.test(ae)) { body = e.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(PORT, () => console.log(`Sirviendo ${ROOT} en http://localhost:${PORT} (brotli/gzip + _headers)`));
