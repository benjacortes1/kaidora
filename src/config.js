/* ===================================================================== config.js
   Ajustes de rendimiento, cada uno fácil de revertir (build.py también lee MOBILE_MQ e INTRO_MAX_S para el HTML).
   Para volver a como estaba antes de la optimización:
     MOBILE_MQ     = 'not all'   → sin portada móvil: también en móvil se ve el kit (antes no había versión móvil)
     KIT_SCROLL_VH = 200         → recorrido del kit de antes
     INTRO_MAX_S   = 1          → la intro ya duraba 1 s (antes con GSAP; ahora con CSS, empieza en el primer pintado)
     LENIS_LERP    = 0.12        → suavizado de la rueda de antes */

// qué cuenta como móvil: portada solo con el logo y las 4 categorías (sin kit, sin GSAP, sin Lenis, sin fotogramas)
const MOBILE_MQ = '(max-width: 767px)';
// recorrido de scroll de la animación del kit (en vh); la subida de las tarjetas no cambia
const KIT_SCROLL_VH = 130;
// duración máxima de la pantalla de carga con el logo (s); no se repite en la misma sesión
const INTRO_MAX_S = 1;
// Lenis: respuesta de la rueda (más alto = se asienta antes; 0,15 ≈ 300 ms)
const LENIS_LERP = 0.15;
