# Kaidora · Actividad 1 · Sistemas de Información para la Gestión

Grupo: Daniela Navarro, Ainhoa Rodríguez y Yaiza de Pablo · Entrega: 07/10/2026

## Entregables

| Entregable | Dónde |
|---|---|
| Dashboard (Inicio + TPS, MIS, DSS, ESS) listo para publicar | carpeta `web/` entera (con `_headers`, `assets/`, `fonts/`, `art/`, `kit/`) |
| Vista previa en claude.ai | https://claude.ai/artifact/BXpCx5hN7zhmnmL3qEEVZ3 |
| Reflexión de 1 página (ODS 5 y 10), editable y exportable a Word o PDF | https://claude.ai/code/artifact/903645c8-d3b1-49a4-b9c2-2df5ee75f399 |
| Datos simulados (anexo) | `datos/csv/*.csv` y `datos/kaidora_datos.json` |

## Publicar en internet con Netlify (gratis, unos 3 minutos)

1. Crea una cuenta gratuita en https://app.netlify.com/signup
2. Abre https://app.netlify.com/drop y arrastra la carpeta `web` entera.
3. En el sitio creado: **Site configuration › Change site name** y escribe `kaidora-es`
   (kaidora.netlify.app ya está ocupado por otra web). La dirección queda: https://kaidora-es.netlify.app
4. Para actualizarlo: **Deploys** › arrastra de nuevo la carpeta `web`.

La web lleva `noindex`, así que no aparecerá en Google (es una empresa ficticia).

## Datos

`datos/generar_datos.py` (Python 3, sin librerías externas, semilla fija 2026) simula de enero de 2022
a septiembre de 2026, solo España, con desglose por las 17 comunidades autónomas más Ceuta y Melilla: ventas por mes × canal × línea
× comunidad, presupuesto, producción y OEE por nave, plantilla de 150 personas seudonimizadas,
proveedores, componentes con lotes y caducidades, y datos de clientes. Todos los datos son ficticios.

```
python datos/generar_datos.py
python build.py
```

`build.py` une `src/` con los datos y genera la carpeta `web/` (Netlify) y `dist/kaidora_artifact.html` (Claude).
Necesita Node; `npm install` en esta carpeta instala esbuild, que minifica el JavaScript (sin él la web funciona igual, solo pesa más).

## Rendimiento (octubre de 2026)

Mediciones y scripts en `perf/` (`perf/INFORME.md`: tabla antes/después; `perf/antes.json`, `perf/despues.json`).
Ajustes, cada uno en una constante de `src/config.js` (fácil de revertir):

| Constante | Valor | Antes | Qué hace |
|---|---|---|---|
| `MOBILE_MQ` | `'(max-width: 767px)'` | no había versión móvil (`'not all'`) | en móvil la portada es solo el logo y las 4 categorías: sin kit, sin GSAP/Lenis y sin pedir fotogramas |
| `KIT_SCROLL_VH` | `130` | `200` | recorrido de scroll de la animación del kit (mismos fotogramas, menos scroll) |
| `INTRO_MAX_S` | `1` | `1` | pantalla de carga con el logo; ahora con CSS (empieza en el primer pintado) y no se repite en la misma sesión |
| `LENIS_LERP` | `0.15` | `0.12` | respuesta de la rueda en la portada (se asienta en ~0,35 s) |

- `web/`: `index.html` (70 KB, CSS en línea y la portada móvil ya escrita) + `assets/app.<huella>.js` (minificado) +
  `assets/vendor.<huella>.js` (GSAP, ScrollTrigger y Lenis; solo se pide en tableta y escritorio) + `assets/data.<huella>.json` +
  `fonts/inter-*.<huella>.woff2` (Inter alojada en la propia web, licencia SIL OFL en `fonts/OFL.txt`) + `art/` + `kit/`.
  `_headers`: todo lo que lleva huella o `?v=` se guarda un año sin volver a pedirse; la página se revalida en cada visita.
- La portada móvil la escribe `build.py` en el HTML ejecutando la propia app en Node (`tools/prerender.mjs`): se ve desde el primer
  pintado y, cuando llega el JavaScript, se aprovecha tal cual si coincide su huella. En móvil, la aplicación y los datos se piden
  cuando los dibujos de las tarjetas ya se ven (o antes, si se toca la pantalla), para no quitarles ancho de banda: LCP 3,2 → 2,1 s.
- Kit (tableta y escritorio): el primer fotograma se precarga con prioridad alta; el resto se descarga con prioridad baja, 6 a la vez,
  cuando ya se ha pintado el primero y ha terminado la intro, y se pausa al salir de la portada. Como máximo 20 fotogramas en memoria
  (antes 40), descomprimidos ya al tamaño del lienzo y por delante de donde estará el scroll. Con «ahorro de datos», un solo fotograma.
- Fotogramas recodificados a WebP calidad 72 con libwebp (`perf/recodificar_kit.mjs`): 6,25 → 4,7 MB, diferencia imperceptible
  (PSNR ~44 dB). Los originales están en `src/assets/kit_original/` (no se publican); para volver, copiarlos sobre `src/assets/kit/`.
- Los gráficos que quedan fuera de la pantalla (en móvil) se dibujan al acercarse; al cambiar el tamaño, se redibujan una vez.
- Servidor local que imita a Netlify (brotli + `_headers`): `node tools/servidor.mjs web 8790`.

## Diseño y librerías

- Identidad: logo «K» geométrico, azul noche `#0b1b3a` y azul eléctrico `#2563eb`, tipografía Inter (alojada en la web; en la versión de Claude, de Google Fonts).
- Inicio: pantalla de carga de 1 s con el logo → en tableta y escritorio, el **kit de salud personal de Kaidora** se abre con el scroll,
  fotograma a fotograma (como las páginas de producto de Apple), hasta mostrar los aparatos en la bandeja → las 4 categorías suben sobre
  el kit atenuado. En móvil, directamente las 4 categorías. Al volver de un panel con «Inicio» se llega directamente a las tarjetas;
  el logo de arriba a la izquierda recarga la web desde el principio (intro de 1 s y kit cerrado arriba, listo para el scroll).
- Portada: tarjeta «Kit de salud personal · Tu salud, siempre a mano» sobre la animación.
- Paneles: todos los recuadros se pueden ampliar (gráficos con vista de datos; tablas, deslizadores e indicadores se amplían tal cual).
  MIS sin panel de excepciones; ESS con cuadro de mando integral de 6 indicadores e indicadores ODS 5 y 10 (sin energía renovable).
- Kit: imágenes del grupo generadas con Gemini (`_muestras/kit_*.png`) y el vídeo `_muestras/kit_1.mp4`, hecho con Google Flow a partir de ellas.
  Sus 192 fotogramas (24 fps, 1600 px, WebP, 4,7 MB) están en `src/assets/kit/` y el empaquetado los copia a `web/kit/`:
  **sube siempre la carpeta `web` entera**.
- Scroll suave: [Lenis 1.3](https://github.com/darkroomengineering/lenis) (MIT) + [GSAP 3.15 con ScrollTrigger](https://github.com/greensock/GSAP) (licencia estándar gratuita).
- Rendimiento de la portada (`src/kitseq.js`): ver «Rendimiento». Sin desenfoques (`backdrop-filter`) ni fondos animados.
- Netlify: `web/_headers` va incluido al arrastrar la carpeta `web`. En la versión para Claude (`dist/`) todo va en un archivo.
- Vista previa al compartir el enlace (WhatsApp, Teams…): `web/og.jpg`, e icono para la pantalla de inicio del móvil: `web/apple-touch-icon.png`.
  Se generan con `node datos/generar_previas.js`. Usan la dirección `https://kaidoraspain.netlify.app` (si cambia, editar `SITE` en `build.py`).
  En Netlify conviene desactivar la insignia «Powered by Netlify» (Project configuration → General): en el móvil tapa las pestañas.
- Carga y fluidez de los paneles: los datos van en un JSON aparte (`JSON.parse`, más rápido que un literal); las agregaciones se calculan
  una vez y se recuerdan; las medidas de texto de los gráficos también; la tabla de transacciones pinta 60 filas y el resto cuando el
  navegador está libre. Al cambiar de panel, el que se deja se vacía (menos memoria, sin identificadores repetidos). 125 navegaciones
  seguidas no aumentan la memoria. `build.py` comprueba la sintaxis del JavaScript con Node antes de dar el empaquetado por bueno.
- Textos: ninguno se corta ni se pisa en 7 anchos de pantalla (móvil, tableta, 1024 a 1920), ni con tema oscuro y letra al 125 %.
  Los títulos de los recuadros y las etiquetas de los KPI usan hasta 2 líneas; la cascada del MIS pasa a filas cuando los nombres no caben;
  en tableta vertical el DSS coloca los supuestos arriba y los gráficos a todo el ancho; en el móvil las 5 pestañas caben sin deslizar.
- Accesibilidad verificada con axe-core (WCAG 2.2 AA, sin incidencias): gráficos con barras pulsables expuestos como grupos de botones,
  los de líneas como deslizador que anuncia cada valor, tablas con scroll alcanzables con el teclado, contraste y tamaño táctil mínimo.
- Dibujos de las tarjetas: [Fluent Emoji 3D](https://github.com/microsoft/fluentui-emoji) © Microsoft Corporation, licencia MIT.
- Mapa de España (MIS, en la columna derecha): Península, Baleares y Ceuta y Melilla ampliadas. Canarias no se dibuja para ganar tamaño;
  sus datos siguen en la tabla del mapa («Ver datos»), en el filtro de comunidad y en los resúmenes.
  Geometrías © [Instituto Geográfico Nacional](https://www.ign.es) (CC BY 4.0) vía [es-atlas](https://github.com/martgnz/es-atlas) (MIT),
  proyectadas con [d3-composite-projections](https://github.com/rveciana/d3-composite-projections) (BSD-3) por `datos/generar_mapa.mjs`.
- **Accesibilidad para personas ciegas:**
  - Gráficos que se escuchan: el botón con el altavoz de cada gráfico lee en voz alta un resumen (voz del navegador, en español)
    y después convierte los datos en tonos (más agudo = valor más alto; de izquierda a derecha = eje del tiempo).
    «Escuchar», junto a «Ficha», lee los indicadores clave del panel. Esc detiene el sonido. El resumen también va como descripción
    oculta para lectores de pantalla y líneas braille (`src/listen.js`).
  - DSS: coste «Braille y guía en audio» (€/kit) en el modelo del Kit Accesible; el coste total del escenario base no cambia (16,90 + 0,60 €).
  - TPS: componente «Etiquetas braille (lámina)» en el inventario; ESS: indicador «Stock de etiquetas braille» (días de cobertura).
- Con «reducir movimiento» activado en el sistema, la portada se muestra estática con el kit ya abierto.
- Portada en tableta vertical: las tarjetas suben justo bajo el kit cuando termina de abrirse (`margin-top: -38svh`),
  sin el tramo vacío de antes. Al volver de un panel se aterriza en las tarjetas sin animación de entrada (antes el kit se veía
  oscuro o desaparecía al subir); al recargar se empieza arriba. Si un fotograma falla al descargarse, se reintenta.
- Para presentar: conecta el portátil al cargador. Con batería baja, Windows y Chrome limitan la web a unos 30 fotogramas por segundo.

## Plantillas de referencia

`../plantillas/next-shadcn-dashboard-starter` (Next.js + shadcn/ui) está descargada solo como referencia de diseño;
no forma parte de la entrega ni está instalada.
La primera versión (con recorrido guiado y secciones extra) está archivada en `_version1/`.
