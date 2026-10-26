# BOLETA · producción verificada22/10/2026

## Estado actual
Vitrina Cromada elegida por Cristian y publicada en https://boleta-catalog.onrender.com.
Código desplegado b13840c6f5bd30135f1e985088a65191403950e4; PR1 fusionado. Render deploy dep-dbd8r315efls73aisr50 LIVE desde22:29:19UTC22/10. Los commits posteriores de documentación usan [skip render]; no requieren redeploy.
WorkspaceRender tea-d1vr5n2li9vc73fq65bg confirmado por propietario. Servicio existente srv-db3e4b5g1s2s73a2ucfg, rama main/autodeploy, PythonFreeOregon,1instancia. No se crearon servicios ni se cambiaron planes/costos.

## Diseño y funcionamiento
- Hero cromado con fondo originalWebP128KB +cutouts de lentes/anillo reales; debajo catálogo con fotosQC originales,120productos por carga progresiva. No inferir autenticidad/materiales desde títulos heredados.
- Morado#60328A/negro/claro, fuente hero independiente editable, fondo/medios/textos/logoagencia editables.
- Guía Track+Flares serio, negro/morado, tattoo único bajo ojoizquierdo, cuerpo completo contain. Tutorial y FAQ editables, no aprendizaje inventado.
- Introcontador1→1001200ms+100ms cierre; animación editorial, no porcentaje realdedescarga; fallbackCSSy reducedmotion.
- Encargo con variante obligatoria, cantidad, revalidación, precio pendiente/confirmado y mensajeWhatsApp. No reserva/pago automático. B2C584245314215/B2B573215885381.
- Ruleta yplaneta retirados explícitamente. Endpointlegado410. No cuenta obligatoria ni falsa prueba social.
- RadioSpotify7JwsCKwcOZGfaWoJu8guQn soloalclick, sin iframe/audioinicial.
- Contactos opt-in separados, no campañasautomáticas. Métricas opt-in privadas; clic noequivale venta.

## Editor y persistencia remotos verificados
Entrada /?editor o pie Editar página. Contraseña elegida porpropietario configurada SOLOenvRenderADMIN_PASSWORD (mínimo10caracteres por solicitudexpresa), no guardada en Git ni navegador. CookieHttpOnly/Secure, CSRF, sesión8h/unproceso, login denuevo trasrestart.
Supabase zvwcwbkkmtojvolgxbda. Migración boleta_private_visual_editor_state aplicada: tabla boleta_state yRPCcompare-swap; RLStrue ysin permisos anon/authenticated; RPCsolo service_role. Aviso INFO no-policy esperado porque tabla privada backend-only. Tabla public.products120filas y objetos existentes intactos.
Stateadoptado120productos/revision2/settingsv2 después de verificación. Fusión conserva portada, descripción y galerías legacyimagesJSONB/seed sin duplicados. No fallbackwrite efímero. BOLETA_ALLOW_LOCAL_STORAGE=0, BOLETA_ENVproduction, BOLETA_PUBLIC_ORIGIN ySUPABASE_URL configurados, secretosprevios preservados sinleerlos.
Portada subida porAPIeditor a SupabaseStorage product-images ypublicada; sesión nueva confirmóURLycontenido. Guardarborrador no cambiópúblico; publicación preservóhistorial; logout invalidósesión. No se crearon leads/contactos ficticios ni se enviaronmensajes.

## Evidencia
-26/26unittest aisladosPASS; sintaxisapp/editorPASS.
-CI head5201f1e PASS run39864831092.
-9gruposbrowserlocalPASS.
-APIproducción16checksPASS: authcookie/privacidad/IDs/gallery/live/noFallback/uploadStorage/draft/publicación/historial/logout/persistenciafreshsession.
-BrowserpúblicoPASS:120tarjetas, variantes/carrito/WhatsAppsimulado(sinenvío), guía,tema,editorreal/fontshero/logout. Sin erroresJS/recursos inesperados ysin overflow360/390/418/430/1440.
-Un recorrido combinado de estrés120piezas+navegación editor agotó el tiempo del selector; repetido con nueva pestaña de editor completó sin errores. No afirmar rendimiento bajo cualquier carga ni ausencia absoluta de defectos.
-Backup previo120productos: work/backup-22oct/supabase-products-before.json fuera delrepo. FotosQCoriginales verificadas localmente. Entregables/evidenciavisual en outputs/ delworkspacepadre.

## Próximo trabajo comercial
Cristian organiza compra real: piezas/variantes/unidades/precios/fotosQC; no marcar todo el catálogo como comprado. Llegada15/12/2026 es estimación sujeta a logística. Anticipo/cancelaciones yBCVfechado pendientes de decisionesreales. No imponer50%. Banners futuros solo cuando los pida.
Guíaoperativa docs/operar-boleta.md. Evitar reimportarTelegram o tocardatosproductivos para tests. Mantener FastAPI/frontendvanilla ligero salvojustificación.


## Hero3D yediciónvisual25/10/2026
Usuario rechazó heroanterior; adjuntó Concepto02 yprompttécnico. Autorizóreal3D/luces, edicióninline/dragfusión, volverarriba yCTAnegocio+beneficios. Skillboleta y agentes usados.
Backup remoto antes:revision11/settings6/productos120; hero «BOLETA TYPE SHI» ycopy/estudiopersonalizados. Conservar cambios; patchremoto solo hero ystudio.cta/copybeneficios. No resetearproductos/otrasfrases.
Implementado: heroHTMLeditorial +Threev0.180.0selfhost dinámico: escultura proceduraloriginal,cintas/puntas/núcleovioleta,PBRPMREMenvlocal,rot45s/pulse4s/ligeroparallax;4drawcalls≈31kdesktop/17kmobile,DPR<=1.35mobile30fpscap. Pausahidden/offscreen, cleanup, fallbackWebP realcapture, reducedmotion/SaveData/noWebGL.
FuenteGeorgiaeditable,logo intacto,esculturaarriba móvil/texizqdesktop. Fotoambienteoriginalgenerada conimagegen93.5KB, poster realrender46.8KB. No afirmar réplica geométrica exacta de2D niFPSdispositivoreal no medido.
Editorpor tarjeta: Editar/Quitarpublicación(reversible)/Unirfotos. Dragdesktop→confirmación con fotos; táctilselectorvisual+buscador. Destinoconservaprecio/tallas/stock; origenarchivado/restaurable. PanelProductosthumbnails.
CTAnegocio preguntaexplícita y4beneficioseditables. Backtop solo trasbajar. CatálogoQC/carrito/temas/guíaradio siguen.
GZipThree720032→182069bytes(-74.7%), bundle120covers400q72 (1.69MBprivadoserverasset,noextraído),matchSHAoriginal/fallbackPIL. Benchmark24cold13msbundle vs868msPIL laboratorio.
32/32unittestPASS. BrowserWebGLSwiftShader laboratorio: real3D,6anchos360-1440,nooverflow,scrollpause/backtop,archivar/restaurar/unirtáctil/dragcancel,copypúblico/fallbacksinWebGL/reducedmotion PASS,sinerroresJS. No writesproducto enproducción; todaspruebas mutanteslocalesaisladas.
Rama codex/boleta-3d-visual-editor. Publicación/CI/QAremoto pendientes duranteestecheckpoint. Detalles specs/estudio-interactivo/hero-v2.md.
