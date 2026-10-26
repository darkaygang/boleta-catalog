# Assets y rendimiento
- Logo: adaptación morada de logo proporcionado por Cristian. /images/boleta-logo.webp,54.9KB.
- Hero: extracción de fondo asistida por imagegen de fotos existentes BOL-020 y BOL-039. Son composiciones de portada, no certificados ni nuevos productos. Fotografías originales permanecen en dist/photos, sin cambios.
- Guía: Track + Flares aprobado, únicamente tattoo pequeño bajo ojo izquierdo en hoja de referencia; extracción para interfaz y versiones WebP/portrait. Hoja aprobada actualizada entregada fuera repo.
- Fuentes selfhost: Barlow Condensed700 y Manrope variable. Licencias OFL incluidas en dist/fonts. No peticiones a fuentes externas al cargar.
- Ruleta retirada 22/10. Módulo wallpaper histórico no se carga en storefront.
- Logo Digital Solution: PNG proporcionado por Cristian, derivado WebP600x600 (29.3KB), sin rediseñar. Campo studio.logo editable.
- Transiciones CSS, sin React/Framer/WebGL añadidos. Spotify no se monta inicialmente.
- Miniaturas derivadas en memoria máximo480px, WebP75, caché64. /api/thumbnail solo archivos públicos photos; foto de detalle original.
- No se generaron videos; no hay reproducción simulada de Spotify.

Las capturas se toman del navegador local; métricas son laboratorio local, no una promesa de velocidad en redes reales de Venezuela. Falta medir campo después del despliegue.

Vitrina Cromada: hero-chrome-backdrop.webp850x1087,128.4KB, fondo original generado con imagegen a partir de dirección elegida. Ornamento y suelo solamente; productos hero permanecen cutouts anteriores y fotosQC del grid originales. Sin video/WebGL. Prompt y arte fuente en entrega local, asset consumido incluido enrepo.


25/10: Three.js0.180.0 selfhost en dist/js/vendor, licenciaMIT incluida. SinGLBexistente:esculturaproceduralpropia. Fondo hero-v2-ground.webp93.5KBporimagegen;hero-v2-poster.webp46.8KBcapturado delrendererreal transparente. No spritesimulado3D. CSS/WAAPI+WebGLsinReact/GSAP/postbloomglobal.
GZip paraJS/CSS. server/assets/catalog-thumbnails.zip recompilable conpython scripts/build_thumbnails.py;120covers400pxq72,hashSHA256original,cache4MBbounded, nuevasfotos fallback. Originalesintactos. Validación yapruebas tests/test_performance.py.
