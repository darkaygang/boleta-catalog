# Especificación Técnica — Showcase Editorial Interactivo

## Requisitos EARS

RF-01 (Lookbook Layout):
El sistema deberá renderizar una grilla editorial minimalista con tarjetas de producto que muestren foto recortada/limpia, código, nombre y precio de referencia.

RF-02 (Interactive Cart Mechanism):
CUANDO el usuario arrastre un producto hacia el contenedor del carrito O haga click en el botón de agregar, el sistema deberá disparar una animación de ingreso del item al carrito y actualizar el contador en tiempo real.

RF-03 (B2B Growth Hook):
El sistema deberá fijar un badge/banner no invasivo "¿Quieres una página web para tu negocio así? Escríbeme" que abra un chat de WhatsApp con el texto: "Hola Cristian, vi la página de Boleta y me interesa una vitrina web interactiva para mi negocio".

RF-04 (WhatsApp Checkout Generator):
CUANDO el usuario pulse "Confirmar pedido por encargo", el sistema deberá generar un enlace universal `https://wa.me/` con los modelos, tallas/variantes seleccionadas, desglose dual de montos y solicitud de pago de inicial del 50%.

RF-05 (Mobile-First Responsiveness):
MIENTRAS la resolución sea menor a 768px (incluyendo dispositivos de 360px a 420px), el sistema deberá organizar los productos en grilla limpia de 2 columnas táctil sin desbordamiento horizontal.

RF-06 (Official Brand Logo):
El sistema deberá renderizar el logo oficial `logo.png` en el header responsive con escalado adaptable (45px en móvil, 60px en escritorio) y resplandor neón violeta sutil.

RF-07 (Drag-to-Merge Gallery in Live Editor):
MIENTRAS el Modo Editor esté activo, CUANDO el usuario arrastre una tarjeta de producto sobre otra, el sistema deberá solicitar confirmación modal para transferir la imagen del producto arrastrado al array de galería del producto receptor y marcar el producto de origen como descartado.
DONDE un producto posea múltiples imágenes en galería, la tarjeta deberá proveer controles de navegación (dots o flechas) para alternar las fotos disponibles.

RF-08 (Multi-keyword Search):
CUANDO el usuario ingrese una búsqueda, el sistema deberá normalizar el texto removiendo diacríticos/tildes y verificar que todos los tokens ingresados coincidan con el título, código, categoría, marca o especificaciones del producto.

RF-09 (Independent Dual-Currency Checkout Math):
El sistema deberá calcular y desglosar por separado la sumatoria en USD y la sumatoria en BCV de los artículos en el carrito, sin aplicar conversiones automáticas entre monedas:
- Total en USD y Total en BCV referencial.
- Abono de inicial (50%) en USD y BCV.
- Saldo restante (50%) a cancelar al recibir en Barquisimeto o previa guía nacional.
- Leyenda aclaratoria: "Más fotos e información detallada al privado".

RF-10 (Optimized Touch Hit-areas):
MIENTRAS se interactúe en dispositivos móviles (360px a 420px), los botones de acción, selector de tallas y controles de galería deberán mantener áreas táctiles de mínimo 40px sin solapamiento.

RF-11 (Prominent Gothic Brand Logo):
El sistema deberá renderizar el logo gótico BOLETA en el header con presencia visual destacada (altura de 65px a 75px en escritorio, 55px en móvil), fondo transparente, centrado y resplandor púrpura sutil (#9D4EDD / rgba(157, 78, 221, 0.45)).

RF-12 (Persistent SQLite Inventory & Auto-migration):
El sistema deberá almacenar el catálogo en una base de datos SQLite (`data/boleta.db`) con tabla `products` (id, code, title, category, brand, price_usd, price_bcv, numeric_usd, numeric_bcv, image, thumb, gallery, sizes, material, tag, is_purchased, in_stock, status, created_at). Si la base de datos está vacía, se migrarán automáticamente los 114 productos curados de `data/catalog.json`.

RF-13 (FastAPI Endpoints & Unified Static Mount):
El backend FastAPI (`server/main.py`) deberá exponer:
- GET `/api/products`: Catálogo de productos activos.
- POST `/api/products`: Creación de nuevos productos con recepción de FormData o JSON y subida de imágenes.
- PATCH `/api/products/{id}`: Actualización de campos y marcado de `is_purchased` / `in_stock`.
- POST `/api/upload`: Subida multipart de imágenes a `dist/photos/`.
- Montar `dist/` como `StaticFiles(directory="dist", html=True)` para servir interfaz y API bajo el mismo origen.
- Leer el puerto dinámicamente de la variable de entorno `$PORT` (default 8080).

RF-14 (In-Browser Add Product Modal):
MIENTRAS el Modo Editor esté activo, la barra superior deberá ofrecer el botón "➕ Nuevo Item". Al pulsarlo, se abrirá un modal flotante oscuro con subida de fotos (drag & drop o selector de archivos), campos de título, categoría, marca, precio USD/BCV, material y tallas, enviando un `FormData` a `/api/products` y actualizando el catálogo reactivamente.

RF-15 (Render.com Zero-Config Deployment):
El repositorio deberá incluir `requirements.txt` (con `fastapi`, `uvicorn[standard]`, `python-multipart`) y `render.yaml` para despliegue automatizado en Render con comando de inicio `uvicorn server.main:app --host 0.0.0.0 --port $PORT`.
