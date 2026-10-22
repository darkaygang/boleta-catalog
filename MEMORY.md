# BOLETA — checkpoint 22/10/2026
## Confirmado
Cristian eligió diseño C con cuadro guía A, autorizó construcción y agentes. URL producción https://boleta-catalog.onrender.com.
Base auditada main 7fbff1011d00f915b8d964e366ef201c74a05580. Se preservaron datos/fotos originales.
Se construyó en rama codex/boleta-estudio-interactivo. No se ha desplegado rediseño todavía.

## Implementado y verificado localmente
- Frontend ligero vanilla + CSS: opción C, temas, intro1→100 (1200ms +100ms cierre), hero con lentes/anillo del catálogo, fuentes locales.
- Guía/FAQ/tutorial y encargo reescrito, variante/cantidad/precios con revalidación WhatsApp.
- Guía tattoo único bajo ojo izquierdo; hoja actualizada entregada al propietario. Assets optimizados.
- Editor visual autenticado: contenidos/fuentes/color/medios/FAQ/orden/visibilidad/piezas, borrador/publicación/historial.
- Auth cookie HttpOnly+CSRF, sin PIN público. ADMIN_PASSWORD>=10 requerido.
- Estado durable privado Supabase JSONB+CAS, migración aditiva docs/supabase-redesign.sql; originales legacy conservados.
- Leads sin cuenta con consentimientos separados, export/eliminación admin; no envía mensajes.
- Métricas agregadas opt-in; clic no prueba conversación o pago.
- Ruleta retirada explícitamente22/10: UI y editor sin premios; endpoint legado410. Históricos privados conservados sin otorgar premios nuevos.
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

## Corrección y propuestas 22/10
- Usuario rechazó planeta/ruleta, pidió contador >=1s, guía completa, logo agencia y tres nuevos bocetos según MP4.
- Agentes frontend/backend/revisión colaboraron; sin cambios en datos ni producción.
- Intro1→1001200ms+100ms, también reduced-motion. Prueba browser desde documento hasta ocultar2161ms (incluye tiempo previo a inicioJS); no representa porcentaje real de descarga. CSS fallback1600ms si noJS.
- Guía fullbody contain en418x678. Logo Digital Solution proporcionado, WebP600x60029.3KB, editable con studio.logo, borradores antiguos compatibles.
- Removidos planeta y ruleta. Compatibilidad de settings/historial, endpoint410 sin mutación. Espacios compactados moderadamente.
- 23/23 unittest y JS app/editor syntax pasan. Nueve grupos de regresión navegador pasan, sin erroresJS/recursos, carrito→WhatsApp/tallas/qty/tema/guía/radio/form/editorpublicarrestaurar. QA adicionalsin overflow360/390/418/430/1440, intro/guía/logo/410.
- Tres MP4 decodificados9fotogramas cadauno: collage rap18.5s; espejoornamental8.93s; marco cromado floral con escena6.03s. Contact sheets locales work/video-reference-22oct.
- Tres bocetos: Archivo de Calle (recomendado identidad rap), Vitrina Cromada, Portal del Drop. Generated con imagegen y referencias de productos/mascota. Son propuestas, NO diseño seleccionado ni materiales/variantes certificados. No cuenta obligatoria.
- Próximo paso: propietario elige dirección o combinación; implementar hero/flujo compacto definitivo. Conserva editor visual.
- PR existente https://github.com/darkaygang/boleta-catalog/pull/1 rama codex/boleta-estudio-interactivo. Preparación Render/Supabase sigue pendiente, sin despliegue en esta sesión.

## Vitrina Cromada confirmada y preparación remota22/10
Usuario eligió02, pidió catálogoQC debajo, contraseña específica soloenv y publicar; agentes autorizados.
- Nuevohero cromado original128.4KB+cutoutsreales; catálogo inmediato con fotosQC contain. Fonts.hero yhero.backdrop editables. MicroanimacionesCSS/movimientoreducido.
- Adopción combina imagesJSONB/galleryremotos/seed sinperder portada/descripciónvigentes.
-26/26unittest y9gruposregresiónbrowser pasan, sinerroresJS/recursos. Revisiónindependiente sinbloqueadores.
- Supabaseproyecto zvwcwbkkmtojvolgxbda único catálogo120. BackupJSON privado work/backup-22oct/supabase-products-before.json. Migración boleta_private_visual_editor_state aplicada; boleta_state nuevaRLS denypublic/RPCsolo service_role,120legacyintactos. Revision0 hasta primera mutación.
- Render tea-d1vr5n2li9vc73fq65bg confirmado por propietario; servicio srv-db3e4b5g1s2s73a2ucfg,main,autodeploycommit,singlefreePython. EnvmergedADMIN_PASSWORD/BOLETA_ENV/ORIGIN/ALLOW_LOCAL_STORAGE0/SUPABASE_URL, secretos anteriores no leídos. Publicación y QAremotos pendientes durante estecheckpoint.
