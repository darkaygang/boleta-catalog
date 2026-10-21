# BOLETA — checkpoint 21/10/2026
## Confirmado
Cristian eligió diseño C con cuadro guía A, autorizó construcción y agentes. URL producción https://boleta-catalog.onrender.com.
Base auditada main 7fbff1011d00f915b8d964e366ef201c74a05580. Se preservaron datos/fotos originales.
Se construyó en rama codex/boleta-estudio-interactivo. No se ha desplegado rediseño todavía.

## Implementado y verificado localmente
- Frontend ligero vanilla + CSS: opción C, temas, intro600ms, hero con lentes/anillo del catálogo, fuentes locales.
- Guía/FAQ/tutorial y encargo reescrito, variante/cantidad/precios con revalidación WhatsApp.
- Guía tattoo único bajo ojo izquierdo; hoja actualizada entregada al propietario. Assets optimizados.
- Editor visual autenticado: contenidos/fuentes/color/medios/FAQ/premios/orden/visibilidad/piezas, borrador/publicación/historial.
- Auth cookie HttpOnly+CSRF, sin PIN público. ADMIN_PASSWORD>=12 requerido.
- Estado durable privado Supabase JSONB+CAS, migración aditiva docs/supabase-redesign.sql; originales legacy conservados.
- Leads sin cuenta con consentimientos separados, export/eliminación admin; no envía mensajes.
- Métricas agregadas opt-in; clic no prueba conversación o pago.
- Ruleta gratuita con 3 fondos reales descargables, sin compra/registro; premios servidor e idempotencia por navegador.
- Spotify solo al pulsar; no audio/video ni iframe inicial. Digital Solution separado.
- Miniaturas cacheadas480px, originales intactos.
- 23/23 tests unittest aislados PASAN. Node syntax tres módulos PASA.
- Browser Chrome local: 10 recorridos/grupos funcionales PASAN, sin errores JS ni recursos fallidos; sin overflow 360/390/430/1440.
- Medición local sin throttling: LCP612ms, CLS0.0037, recursos559163 bytes antes de interacción,16requests,0iframes Spotify. No son métricas de campo.

## Preparación de producción pendiente
1. Backup integral de Supabase/medios real por propietario (backup local tarea solo público + repo).
2. Ejecutar SQL aditivo y configurar ADMIN_PASSWORD, SUPABASE_URL/service key y BOLETA_PUBLIC_ORIGIN.
3. Revisar PR/preview, desplegar con un worker y verificar persistencia. No habilitar disco efímero como almacenamiento.
No hay acceso SQL/variables Render disponible en esta sesión. No afirmar despliegue.
Sin migración, lectura snapshot disponible pero writes503, correctamente sin falso éxito.
Sesiones/rate limits por proceso; login de nuevo tras restart.
Guías: docs/editar-boleta.md y docs/activar-render.md. Specs: specs/estudio-interactivo/.

## Comercial pendiente
Pedido nuevo/fotos/unidades vendibles, variantes reales, precios faltantes, materiales/autenticidad, anticipo/cancelaciones y tasa BCV fechada.
15/12/2026 estimado, no garantizado. No inferir originalidad Chrome Hearts de títulos históricos. Banners posteriores cuando usuario los pida.
