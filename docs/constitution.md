# Constitución — BOLETA INTERACTIVE SHOWCASE

## Principios de Diseño y Arquitectura
1. Interfaz Editorial Dark-Mode: Fondo #09070D / #07050A, tarjetas con bordes sutiles semi-transparentes (1px solid rgba(157, 78, 221, 0.2)), acentos violeta neón (#9D4EDD / #C77DFF).
2. Identidad Visual de Marca: Logotipo oficial `logo.png` integrado de forma fluida y responsiva en el header con resplandor sutil, conservando la esencia gótica y tipográfica.
3. Interacción Fluida: Micro-animaciones en tarjetas, feedback háptico/visual al agregar al carrito, carrusel de variantes y botón flotante de WhatsApp.
4. Fusión Editorial sin Pérdida (Card Merge): El modo editor permite consolidar fotos adicionales de un mismo artículo en una galería unificada sin generar duplicados.
5. Búsqueda Multi-token y Accesible: Búsqueda tolerante a acentos y combinaciones de términos clave en tiempo real.
6. Matemática Dual Rigurosa: Total USD y Total BCV se calculan de manera independiente sumando sus respectivos valores fijados, sin aplicar conversiones automáticas cruzadas inventadas.
7. Claridad Comercial: Todo pedido por encargo desglosa el 50% de abono inicial, el 50% restante contra entrega en Barquisimeto o previo despacho nacional, y recordatorio de confirmación de fotos al privado.
8. Doble Propósito: Venta de catálogo B2C + Demo comercial B2B ("¿Quieres una web así?").
9. Cero Bloqueo Móvil: Cuadrícula de 2 columnas óptima en pantallas de 360px a 420px sin desbordamiento horizontal.
10. Privacidad y Seguridad: Solo la carpeta ./dist/ y los endpoints controlados son públicos; la exportación original de Telegram jamás se expone.
11. Arquitectura Full-Stack Ligera: Backend FastAPI en Python estándar + SQLite (`sqlite3`) embebido para control de inventario y estado persistente de compras sin depender de servicios externos costosos.
12. Carga y Gestión Dinámica de Medios: El sistema permite subir nuevas fotografías a `dist/photos/` y registrarlas en base de datos manteniendo compatibilidad con el pipeline estático.
13. Despliegue Zero-Friction: Compatible con plataformas de un solo contenedor/servicio como Render.com (`uvicorn server.main:app --host 0.0.0.0 --port $PORT`), sirviendo frontend y backend unificados.
