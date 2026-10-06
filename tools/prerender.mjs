// Ejecuta la aplicación (el mismo código que la web) en Node con los datos y devuelve el HTML de la portada móvil y su huella.
// Lo usa build.py para escribir las 4 tarjetas móviles en index.html: así se ven desde el primer pintado, sin esperar al JavaScript.
// Entrada (stdin): JSON { app: "<código de la app>", data: "<datos JSON>" } · Salida (stdout): JSON { html, hash }
import vm from 'node:vm';

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;
const { app, data } = JSON.parse(input);

const noop = () => {};
const el = () => ({ addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, style: { setProperty: noop }, dataset: {}, appendChild: noop });
let result = null;
const document = {
  readyState: 'loading', documentElement: el(), body: el(), head: el(),
  addEventListener: noop, removeEventListener: noop,
  getElementById: (id) => (id === 'kdata' ? { textContent: data } : null),
  querySelector: () => null, querySelectorAll: () => [], createElement: el,
};
const sandbox = {
  document, navigator: { userAgent: 'node' }, location: { hash: '', search: '' }, history: { replaceState: noop },
  matchMedia: () => ({ matches: true, addEventListener: noop, addListener: noop }),
  localStorage: { getItem: () => null, setItem: noop }, sessionStorage: { getItem: () => null, setItem: noop },
  performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame: noop, setTimeout: () => 0, clearTimeout: noop,
  getComputedStyle: () => ({ getPropertyValue: () => '' }), console,
  KAIDORA_PRERENDER: (r) => { result = r; },
};
sandbox.window = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(app, sandbox, { filename: 'app.js' });
if (!result) { console.error('La aplicación no devolvió la portada móvil'); process.exit(1); }
process.stdout.write(JSON.stringify(result));
