# Memoria de Estado

- Estado: Reconstrucción visual completa de "BDV ARCHIVE" finalizada exitosamente siguiendo la referencia `bdv-archive-ui-target.png`, preservando al 100% el backend FastAPI, la base de datos SQLite (`data/boleta.db`), el Modo Editor (`Ctrl + Shift + E`), el Drag-to-Merge y la subida de fotos desde PC.
- Tareas: T01 a T30 completadas y validadas con 10/10 pruebas unitarias pasando en 0.010s.
- Sistema de Diseño Target (BDV ARCHIVE):
  - Paleta: Obsidian Void `#08060D`, Surface `#0F0B16`, Elevated `#15101E`, Acentos Electric Purple `#8B4DFF` y Deep Purple `#5A1ECC`.
  - Tipografías: `Manrope` (Headings, Títulos, Precios) y `DM Mono` (Códigos `#BOL-XXX`, Badges y Metadata).
  - Logotipo oficial canónico: `bdv-branding-reference-pack/assets/bdv-logo-original.png` copiado a `dist/images/logo.png` con 65px de alto (52px en móvil) y resplandor sutil púrpura.
  - Vistas y Secciones:
    01. Hero con badge `╲ BDV / ARCHIVE`, título "PIEZAS QUE NO VES EN CUALQUIER LADO.", wire globe y 4 feature badges.
    02. Catálogo con chips de categoría ('TODOS', 'Joyería', 'Lentes', 'Shorts', 'Prendas', 'Accesorios', 'Objects'), buscador multi-palabra y layout responsive estricto de 2 columnas en móvil (360px-600px).
    03. Quick View Modal con galería de miniaturas a la izquierda, selector de tallas y colores, y botón para añadir al pedido.
    04. Drawer lateral "Mi Pedido" con cálculo matemático independiente de USD y BCV (50% de abono inicial y 50% restante al llegar a Barquisimeto).
    05. Checkout WhatsApp con `encodeURIComponent` estructurado al número oficial `+58 4245314215`.
    06. Sección "Cómo Funciona" con 4 pasos (01 Eliges ➔ 02 Confirmamos ➔ 03 Reservas ➔ 04 Recibes).
    07. Footer con enlace B2B para creación de páginas web al número `+57 321 5885381`.
- Modo Editor & Admin (Regla de Oro Preservada):
  - Atajo global `Ctrl + Shift + E` y botón discreto en footer para encender/apagar.
  - Fusión de duplicados (Drag-to-Merge): Arrastrar Card A sobre Card B despliega modal de confirmación con vista previa dual; al aceptar, traslada las fotos al array `gallery` y descarta el duplicado.
  - Subida de fotos desde la PC con dropzone y selector de archivos dentro del modal de edición (`/api/upload`).
  - Control de items comprados: switch `[ ] Comprado / En Tránsito a Barquisimeto`.
  - Botón "➕ Nuevo Producto" en la barra superior del editor para crear items directamente en SQLite (`data/boleta.db`).
- Servidor Activo:
  - `uvicorn server.main:app --host 127.0.0.1 --port 8080` (FastAPI montando `dist/` estática).
  - Verificado: `http://127.0.0.1:8080/` (200 OK) y `http://127.0.0.1:8080/api/health` (200 OK, 114 productos activos).


