# Plan de Implementación Técnica

1. Configuración de bundle estático moderno (HTML5, Vanilla JS, CSS3 con tokens Obsidian & Neon Purple).
2. Procesamiento de assets: Extraer imágenes limpias desde `ChatExport_2026-10-06/photos` y copiar `ChatExport_2026-10-06/logo.png` a `dist/images/logo.png`.
3. Maquetación del Header con el logotipo oficial de BOLETA, selector de categorías y estado de drop.
4. Implementación del motor de animación (Drag & Drop con Pointer Events / CSS Transform transitions).
5. Implementación del In-Browser Live Editor con atajo `Ctrl+Shift+E`, botones por tarjeta y función Drag-to-Merge para consolidación de imágenes en galerías.
6. Motor de búsqueda multi-palabra (multi-token) con normalización insensible a tildes y mayúsculas.
7. Cálculo desacoplado e independiente de totales en USD y BCV para carrito y drawer.
8. Generación del checkout conversacional de WhatsApp con abono inicial del 50%, saldo contra entrega en Barquisimeto y nota de fotos al privado.
9. Integración del Call To Action B2B para captación de clientes de desarrollo web.
10. Sincronización instantánea mediante `scripts/apply_edits.py` y build en `./dist/`.
11. Verificación en resoluciones móviles de 360px a 420px y suite de pruebas unitarias.
12. Ajuste visual del logo gótico BOLETA en el header (65px-75px desktop, 55px móvil, centrado, resplandor púrpura sutil).
13. Modelado e inicialización de la base de datos SQLite (`data/boleta.db`) y migración inicial desde `data/catalog.json` (114 productos).
14. Implementación del backend FastAPI (`server/main.py` y `server/db.py`) con API REST CRUD, upload de fotos a `dist/photos/` y montaje de `dist/`.
15. Desarrollo del modal interactivo "➕ Nuevo Item" en el editor web (`dist/js/app.js` e `index.html`) con subida drag & drop y llamada asíncrona a `/api/products`.
16. Preparación para Render.com: Creación de `requirements.txt` y `render.yaml`, pruebas unitarias completas y verificación en servidor local.
17. Integración y verificación del logo oficial (`logo qes.png` copiado a `dist/images/logo.png`) en el header responsive.
18. Implementación del PIN gate de seguridad en `dist/js/app.js` e `index.html` (validación contra PIN `3012`, `sessionStorage`, modal Obsidian/Purple y toasts).
19. Enrutamiento dual de WhatsApp (B2C `584245314215` y B2B `573224734848`) y enlaces de redes sociales (Instagram/TikTok con `target="_blank"`).
20. Optimización de endpoint keep-alive `/api/health` en FastAPI y endurecimiento integral de seguridad (headers HTTP, CSP, validación de uploads y prevención XSS).

