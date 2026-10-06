"""Empaqueta el panel de Kaidora.

Salidas:
  - web/   → carpeta lista para subir a Netlify (arrastrar y soltar), con `_headers` incluido:
             index.html (CSS en línea) + assets/app.<hash>.js (minificado, defer) + assets/vendor.<hash>.js (GSAP, ScrollTrigger y
             Lenis: solo se pide en tableta y escritorio) + assets/data.<hash>.json + fonts/inter-*.<hash>.woff2 + art/ + kit/
  - dist/kaidora_artifact.html → versión para publicar como Artifact de claude.ai (todo en un archivo, fuente de Google Fonts)
Uso:  python build.py      (necesita Node; para minificar, `npm install` en esta carpeta instala esbuild)
Los ajustes de rendimiento (MOBILE_MQ, KIT_SCROLL_VH, INTRO_MAX_S, LENIS_LERP) están en src/config.js.
"""
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
VENDOR = ["gsap.min.js", "ScrollTrigger.min.js", "lenis.min.js"]   # GSAP 3.15 (licencia estándar gratuita) · Lenis 1.3 (MIT)
ART = {"tps": "tps.webp", "mis": "mis.webp", "dss": "dss.webp", "ess": "ess.webp"}   # Fluent Emoji 3D © Microsoft (MIT)
JS_ORDER = ["config.js", "core.js", "listen.js", "charts.js", "view_tps.js", "view_mis.js", "view_dss.js", "view_ess.js", "kitseq.js", "view_home.js", "main.js"]
FONTS = [  # Inter v20 de Google Fonts (mismos archivos, ejes opsz 14–32 y wght 400–800 y subconjuntos), licencia SIL OFL 1.1
    ("inter-latin-ext.woff2", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"),
    ("inter-latin.woff2", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"),
]
GOOGLE_FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap" media="print" onload="this.media=\'all\'">\n'
                '<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap"></noscript>')
FAVICON = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">'
           '<stop offset="0" stop-color="#5b9bff"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#1636a8"/></linearGradient></defs>'
           '<rect width="48" height="48" rx="13" fill="url(#a)"/><g fill="none" stroke-linecap="round" stroke-width="5.4">'
           '<path d="M17 13v22" stroke="#fff"/><path d="M31.5 13 19.6 24.6" stroke="#fff"/><path d="M23.2 21.1 32 35" stroke="#b9d3ff"/></g></svg>')
SITE = "https://kaidoraspain.netlify.app"
IMMUTABLE = "Cache-Control: public, max-age=31536000, immutable"


def read(*p):
    with open(os.path.join(*p), encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def sha(data):
    return hashlib.sha1(data if isinstance(data, bytes) else data.encode("utf-8")).hexdigest()[:10]


def file_hash(*paths):
    h = hashlib.sha1()
    for path in paths:
        h.update(os.path.basename(path).encode())
        with open(path, "rb") as fh:
            h.update(fh.read())
    return h.hexdigest()[:10]


NODE = shutil.which("node")
ESBUILD = os.path.join(HERE, "node_modules", "esbuild", "bin", "esbuild")


def minify(js):
    """Minifica con esbuild (si está instalado); si no, devuelve el código tal cual (funciona igual, solo pesa más)."""
    if not (NODE and os.path.isfile(ESBUILD)):
        print("Aviso: esbuild no está instalado (npm install): el JavaScript va sin minificar")
        return js
    res = subprocess.run([NODE, ESBUILD, "--minify", "--loader=js", "--charset=utf8", "--legal-comments=none"],
                         input=js.encode("utf-8"), capture_output=True)
    if res.returncode:
        sys.exit("ERROR al minificar:\n" + res.stderr.decode("utf-8", "replace"))
    return res.stdout.decode("utf-8")


def prerender(app_code):
    """Portada móvil escrita en el HTML: ejecuta la app en Node (tools/prerender.mjs) y devuelve {html, hash} o None."""
    if not NODE:
        return None
    res = subprocess.run([NODE, os.path.join(HERE, "tools", "prerender.mjs")], input=json.dumps({"app": app_code, "data": data}).encode("utf-8"), capture_output=True)
    if res.returncode:
        print("Aviso: no se pudo escribir la portada móvil en el HTML:\n" + res.stderr.decode("utf-8", "replace"))
        return None
    return json.loads(res.stdout.decode("utf-8"))


def check(js, name):
    """Comprobación de sintaxis con Node: un error dejaría la web en blanco."""
    if not NODE:
        return
    tmp = os.path.join(HERE, "dist", "_check.js")
    write(tmp, js)
    res = subprocess.run([NODE, "--check", tmp], capture_output=True, text=True)
    os.remove(tmp)
    if res.returncode:
        sys.exit(f"ERROR de sintaxis en {name}:\n" + res.stderr)


# ------------------------------------------------------------------ ajustes de src/config.js que también usa el HTML
config = read(SRC, "config.js")
MOBILE_MQ = re.search(r"const MOBILE_MQ = '([^']*)'", config).group(1)
INTRO_MAX_S = re.search(r"const INTRO_MAX_S = ([\d.]+)", config).group(1)
m = re.fullmatch(r"\(max-width:\s*(\d+)px\)", MOBILE_MQ.strip())
NOT_MOBILE = f"(min-width: {int(m.group(1)) + 1}px)" if m else ("all" if MOBILE_MQ.strip() == "not all" else f"not all and {MOBILE_MQ}")

# ------------------------------------------------------------------ piezas comunes
data = read(HERE, "datos", "kaidora_datos.json")
vendor = "\n".join(re.sub(r"//# sourceMappingURL=\S+", "", read(SRC, "vendor", f)) for f in VENDOR)
mapa = read(SRC, "mapa_espana.json")   # trazados del IGN (CC BY 4.0) proyectados por datos/generar_mapa.mjs
code = "\n".join(read(SRC, f) for f in JS_ORDER).replace("/*__MAPA__*/ null", mapa)
css = "\n".join(read(SRC, f) for f in ["styles.css", "styles_v2.css", "styles_v3.css"])
template = read(SRC, "index.template.html").replace("/*__INTRO_MAX_S__*/1", INTRO_MAX_S)
kit_dir = os.path.join(SRC, "assets", "kit")
kit_files = sorted(os.listdir(kit_dir))
kitv = file_hash(*[os.path.join(kit_dir, f) for f in kit_files])   # versión de los fotogramas: si cambian, cambia
art_files = {k: os.path.join(SRC, "assets", f) for k, f in ART.items()}
KITV, ARTP, VENDP, DATAP = "/*__KITV__*/''", "/*__ART__*/ {}", "/*__VENDOR_URL__*/''", "/*__DATA_URL__*/''"


def app(art_json, kit_v, vendor_url, data_url):
    """Toda la aplicación dentro de KAIDORA(DATA). Los datos llegan de <script id="kdata"> (versión de Claude) o de data.json (web)."""
    body = code.replace(KITV, json.dumps(kit_v)).replace(ARTP, art_json).replace(VENDP, json.dumps(vendor_url))
    return ("(function () {\n'use strict';\nfunction KAIDORA(DATA) {\n" + body + "\n}\n"
            "var el = document.getElementById('kdata');\n"
            "if (el) KAIDORA(JSON.parse(el.textContent));\n"
            "else fetch(" + json.dumps(data_url) + ").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(KAIDORA)"
            ".catch(function (e) { console.error('No se pudieron cargar los datos de Kaidora', e); });\n"
            "})();\n")


def loader_web(app_url, data_url):
    """Carga de la aplicación en la web (al final del body). En móvil, con la portada ya escrita en el HTML, la aplicación y los datos
    se piden cuando los dibujos de las tarjetas ya se ven (load + entrada LCP de una imagen), para no quitarles ancho de banda;
    antes si se toca la pantalla o se pasa a escritorio, y como tope a los 4 s. En el resto de casos (y en tableta y escritorio), enseguida."""
    return ("<script>\n(function () {\n"
            "  var hecho = false, cargar = function (pre) { if (hecho) return; hecho = true;\n"
            "    if (pre) { var l = document.createElement('link'); l.rel = 'preload'; l.as = 'fetch'; l.crossOrigin = 'anonymous'; l.href = " + json.dumps(data_url) + "; document.head.appendChild(l); }\n"
            "    var s = document.createElement('script'); s.src = " + json.dumps(app_url) + "; document.body.appendChild(s); };\n"
            "  var mq = matchMedia(" + json.dumps(MOBILE_MQ) + ");\n"
            "  if (!(document.querySelector('#view-home[data-pre]') && mq.matches && !/^#(?!home$)./.test(location.hash))) return cargar(false);\n"
            "  var ya = function () { cargar(true); }, tras = function () {\n"
            "    try { if (PerformanceObserver.supportedEntryTypes.indexOf('largest-contentful-paint') >= 0) {\n"
            "      new PerformanceObserver(function (l, o) { if (l.getEntries().some(function (e) { return e.element && e.element.tagName === 'IMG'; })) { o.disconnect(); setTimeout(ya, 0); } })"
            ".observe({ type: 'largest-contentful-paint', buffered: true }); return; } } catch (e) { /* sin LCP: tras el pintado siguiente */ }\n"
            "    requestAnimationFrame(function () { setTimeout(ya, 0); }); };\n"
            "  if (document.readyState === 'complete') tras(); else addEventListener('load', tras);\n"
            "  addEventListener('pointerdown', ya, { once: true, passive: true });\n"
            "  if (mq.addEventListener) mq.addEventListener('change', ya);\n"
            "  setTimeout(ya, 4000);\n"
            "})();\n</script>\n")


# ------------------------------------------------------------------ dist: versión para Claude (un solo archivo)
art_b64 = json.dumps({k: "data:image/webp;base64," + base64.b64encode(open(f, "rb").read()).decode("ascii") for k, f in art_files.items()})
app_dist = minify(app(art_b64, "", "", ""))
check(app_dist, "la versión de Claude")
scripts_dist = ('<script type="application/json" id="kdata">' + data.replace("</", r"<\/") + "</script>\n<script>\n" + vendor + "\n" + app_dist + "\n</script>")
page_dist = (template.replace("/*__HEAD__*/", GOOGLE_FONTS).replace("/*__CSS__*/", css).replace("/*__SCRIPTS__*/", scripts_dist))
write(os.path.join(HERE, "dist", "kaidora_artifact.html"), page_dist)

# ------------------------------------------------------------------ web: Netlify
WEB = os.path.join(HERE, "web")
for d in ("assets", "fonts", "art", "kit"):
    if os.path.isdir(os.path.join(WEB, d)):
        shutil.rmtree(os.path.join(WEB, d))
os.makedirs(os.path.join(WEB, "assets")); os.makedirs(os.path.join(WEB, "fonts")); os.makedirs(os.path.join(WEB, "art"))

# archivos con huella en el nombre (caché de un año)
vendor_name = f"assets/vendor.{sha(vendor)}.js"
write(os.path.join(WEB, vendor_name), vendor)
data_name = f"assets/data.{sha(data)}.json"
write(os.path.join(WEB, data_name), data)
font_names = {}
for f, _ in FONTS:
    raw = open(os.path.join(SRC, "assets", "fonts", f), "rb").read()
    font_names[f] = f"fonts/{f[:-6]}.{sha(raw)}.woff2"
    with open(os.path.join(WEB, font_names[f]), "wb") as fh:
        fh.write(raw)
shutil.copyfile(os.path.join(SRC, "assets", "fonts", "OFL.txt"), os.path.join(WEB, "fonts", "OFL.txt"))
art_web = {k: "art/" + os.path.basename(f) + "?v=" + file_hash(f) for k, f in art_files.items()}
for f in art_files.values():
    shutil.copyfile(f, os.path.join(WEB, "art", os.path.basename(f)))
shutil.copytree(kit_dir, os.path.join(WEB, "kit"))
app_web_src = app(json.dumps(art_web), "?v=" + kitv, vendor_name, data_name)
pre = prerender(app_web_src)   # las 4 tarjetas móviles, con las cifras que calcula la propia app
app_web = minify(app_web_src)
check(app_web, "la web")
app_name = f"assets/app.{sha(app_web)}.js"
write(os.path.join(WEB, app_name), app_web)

font_css = "\n".join("@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400 800; font-display: swap; "
                     f"src: url({font_names[f]}) format('woff2'); unicode-range: {rng}; }}" for f, rng in FONTS)
kit0, kit_last = f"kit/{kit_files[0]}?v={kitv}", f"kit/{kit_files[-1]}?v={kitv}"
head_web = "\n".join([
    # fuente propia (antes, Google Fonts): solo se precarga el subconjunto latino, que es el que usa la web
    f'<link rel="preload" href="{font_names["inter-latin.woff2"]}" as="font" type="font/woff2" crossorigin>',
    # datos y aplicación: en tableta y escritorio, en paralelo desde el principio (la aplicación se inserta al final del body);
    # en móvil no se precargan: se piden cuando ya se ven las tarjetas (ver loader_web())
    f'<link rel="preload" href="{data_name}" as="fetch" crossorigin media="{NOT_MOBILE}">',
    f'<link rel="preload" href="{app_name}" as="script" media="{NOT_MOBILE}">',
    # solo tableta y escritorio (no móvil): GSAP/ScrollTrigger/Lenis y el primer fotograma del kit (o el último, si se pide menos movimiento)
    f'<link rel="preload" href="{vendor_name}" as="script" media="{NOT_MOBILE} and (prefers-reduced-motion: no-preference)">',
    f'<link rel="preload" href="{kit0}" as="image" fetchpriority="high" media="{NOT_MOBILE} and (prefers-reduced-motion: no-preference)">',
    f'<link rel="preload" href="{kit_last}" as="image" media="{NOT_MOBILE} and (prefers-reduced-motion: reduce)">',
    # solo móvil: los 4 dibujos de las tarjetas, que son lo primero que se ve
] + [f'<link rel="preload" href="{u}" as="image" fetchpriority="high" media="{MOBILE_MQ}">' for u in art_web.values()])
doc_head = ('<!doctype html>\n<html lang="es">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<link rel="icon" href="favicon.svg" type="image/svg+xml">\n'
            '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
            '<meta property="og:type" content="website">\n'
            '<meta property="og:locale" content="es_ES">\n'
            '<meta property="og:title" content="Kaidora · Panel de gestión">\n'
            '<meta property="og:description" content="Los cuatro sistemas de información de Kaidora: TPS, MIS, DSS y ESS. Empresa ficticia y datos simulados.">\n'
            f'<meta property="og:url" content="{SITE}/">\n'
            f'<meta property="og:image" content="{SITE}/og.jpg">\n'
            '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            '<meta name="twitter:card" content="summary_large_image">\n')
page_web = (doc_head + template.replace("/*__HEAD__*/", head_web).replace("/*__CSS__*/", font_css + "\n" + css)
            .replace("/*__SCRIPTS__*/", loader_web(app_name, data_name)))
if pre:
    # portada móvil ya pintada: se ve desde el primer pintado (bajo la intro) y el JS la aprovecha si coincide la huella;
    # en tableta y escritorio queda oculta hasta que el JS pinta la portada con el kit
    page_web = page_web.replace('<div class="view" id="view-home"></div>', f'<div class="view" id="view-home" data-pre="{pre["hash"]}">{pre["html"]}</div>', 1)
    page_web = page_web.replace('<div class="intro" id="intro"', '<body data-view="home">\n<div class="intro" id="intro"', 1)
    page_web = page_web.replace("</style>", f"@media {NOT_MOBILE} {{ #view-home[data-pre] {{ display: none; }} }}\n</style>", 1)
page_web += "\n</html>\n"
write(os.path.join(WEB, "index.html"), page_web)
write(os.path.join(WEB, "favicon.svg"), FAVICON)
for f in ("og.jpg", "apple-touch-icon.png"):
    if os.path.isfile(os.path.join(SRC, "assets", f)):
        shutil.copyfile(os.path.join(SRC, "assets", f), os.path.join(WEB, f))
# cabeceras de Netlify: todo lo que lleva huella o versión, caché de un año (ni siquiera se revalida); la página, siempre al día
write(os.path.join(WEB, "_headers"),
      "".join(f"/{d}/*\n  {IMMUTABLE}\n" for d in ("kit", "art", "assets", "fonts"))
      + "/\n  Cache-Control: public, max-age=0, must-revalidate\n"
      + "/index.html\n  Cache-Control: public, max-age=0, must-revalidate\n"
      + "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n")
# los fotogramas también van junto a la versión de Claude
if os.path.isdir(os.path.join(HERE, "dist", "kit")):
    shutil.rmtree(os.path.join(HERE, "dist", "kit"))
shutil.copytree(kit_dir, os.path.join(HERE, "dist", "kit"))

kb = lambda p: round(os.path.getsize(os.path.join(WEB, p)) / 1024)
print(f"OK · index.html {kb('index.html')} KB · {app_name} {kb(app_name)} KB · {vendor_name} {kb(vendor_name)} KB · "
      f"{data_name} {kb(data_name)} KB · dist {round(os.path.getsize(os.path.join(HERE, 'dist', 'kaidora_artifact.html')) / 1024)} KB")
print(f"MOBILE_MQ = {MOBILE_MQ} · no móvil = {NOT_MOBILE} · INTRO_MAX_S = {INTRO_MAX_S}")
