# Memoria de Estado

- Estado: Producción finalizada y ajustada puntualmente para BOLETA CLOTHING. Integración de logo oficial (`dist/images/logo.png`) optimizado para móvil (60px), PIN gate de seguridad administrativo (2026), enrutamiento dual de WhatsApp (B2C +58 4245314215 y B2B +57 3224734848), redes sociales verificadas (Instagram, TikTok, WhatsApp) y servidor FastAPI activo.
- Tareas: Ajustes completados con 10/10 pruebas unitarias pasando (0.052s).
- Identidad de Marca & Logo Oficial:
  - Archivo fuente `logo qes.png` copiado a `dist/images/logo.png`.
  - Dimensiones responsive: 65px de alto en desktop (max-width 240px) y 60px en móvil (max-width 210px) para máxima legibilidad e impacto en teléfonos.
  - Renderizado verificado en el header sticky (`.brand-logo-img`) y en el footer (`.footer-logo`).
- PIN Gate de Seguridad para Modo Editor:
  - Activación por atajo `Ctrl + Shift + E`, botón en footer "⚙️ Modo Editor" o `window.toggleEditMode()`.
  - Verificación de sesión: consulta `sessionStorage.getItem('boleta_admin_auth') === 'true'`.
  - Si no está autenticado, despliega modal `#pinGateModal`.
  - Validación de PIN contra `2026`:
    * Correcto: almacena `sessionStorage.setItem('boleta_admin_auth', 'true')`, cierra modal, activa toolbar de edición y muestra toast "🔓 Modo Editor activado".
    * Incorrecto: muestra alerta `alert("PIN incorrecto")`, mensaje de error en modal, limpia el input y mantiene el foco.
  - Al salir ("✕ Salir"), desactiva el editor manteniendo la seguridad del acceso.
- Enrutamiento de Teléfonos y Redes:
  - Tienda / B2C (Navbar CONTACTO, Checkout de Carrito, Botón Producto WhatsApp, Footer CONTACTO, Icono Teléfono Footer): `584245314215` (`https://wa.me/584245314215`).
  - Agencia / B2B (Card Footer y Badge Flotante "¿Quieres una web así para tu negocio?"): `https://wa.me/573224734848?text=Hola%20Cristian,%20vi%20la%20vitrina%20de%20Boleta%20y%20me%20interesa%20una%20web%20para%20mi%20negocio`.
  - Redes Sociales en footer con `target="_blank"` y `rel="noopener"`:
    * TikTok: `https://www.tiktok.com/@boleta.clothing`
    * Instagram: `https://www.instagram.com/boleta_clothing/`
    * Teléfono / WhatsApp: `https://wa.me/584245314215`
- Seguridad Web & Servidor FastAPI:
  - Keep-Alive: `@app.get("/api/health")` devuelve HTTP 200 inmediatamente con timestamp, uptime y productos activos.
  - Middleware de cabeceras de seguridad HTTP:
    * `X-Content-Type-Options: nosniff`
    * `X-Frame-Options: SAMEORIGIN`
    * `X-XSS-Protection: 1; mode=block`
    * `Referrer-Policy: strict-origin-when-cross-origin`
    * `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none';`
    * `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - Validación de cargas (`/api/upload` y `/api/products`):
    * Extensiones estrictamente permitidas: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`.
    * Límite de tamaño máximo: 10 MB por archivo.
    * Nombres seguros aleatorios (`os.urandom(4).hex()`) para prevenir path traversal y sobrescrituras no deseadas.
  - Frontend saneado con `escapeHtml()` y `sanitizeUrl()` en el renderizado de productos y atributos para prevención de Cross-Site Scripting (XSS).
- Base de Datos & Estado del Catálogo:
  - SQLite persistente en `data/boleta.db` sincronizado bidireccionalmente con `data/catalog.json` y `dist/data/products.json`.
  - 117 productos activos con soporte para creación interactiva, edición, fotos múltiples y fusión de duplicados (Drag-to-Merge).
- Despliegue & Ejecución:
  - Servidor local activo en `http://127.0.0.1:8080/` (`python -m uvicorn server.main:app --host 127.0.0.1 --port 8080`).
  - Configurado para despliegue en Render.com mediante `render.yaml` y `requirements.txt`.
  - Repositorio listo para commit y push a GitHub.
