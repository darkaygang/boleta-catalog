# Hero 3D y gestión visual · 25/10/2026

Pedido confirmado: referencia Concepto02, prompt adjunto como guía técnica; conservar catálogoQC, identidad/logo, navegación, carrito y cambios privados del propietario.

- Hero HTMLsemántico editorial MODA/OBJETOS/IDEAS, desktoptextoizquierda/esculturaderecha, móvilobjetoarriba/textoabajo. Escultura procedural Three.js real, materialcromado/luces/pulso; no bannerconzoom. Diferencia aceptable: formaaproximada al noexistirmodelo3D en referencia2D.
- SelfhostThreev0.180.0 dinámico, sin React/R3F/GSAP añadidos. PBR+PMREMprocedural, 3drawcalls, unas30ktrianglesdesktop, DPRmobile1.35/30FPS, pausa fuera deviewport/oculta, fallbackWebP realcapture,reduced-motion, SaveData/contextloss. No garantía de FPSenGPUrealhasta medir.
- Gestiónvisual inline: editar/quitarpublicación reversible/unirfotos. Dragdesktop sobre otra pieza yselectorvisualtáctil accesible. Confirmarnombres/fotos/origenarchivado/destinoconservado, no fusionar precios/tallas/stock.
- Volverarriba solo tras bajar~unviewport; accesibleteclado ysinbloquearscroll.
- CTAnegocio preguntaexplícita+nuevasecciónbeneficios editables sinpromesasdeventas.
- GZipJS/CSS ythumbsprecalculadas covers existentes paraevitarCPUcoldPIL; originales intactos, hashcompruebavigencia, fallbackparafotosnuevas.
- Backupremoto antesproductos/settings: revision11/settings6/120productos. NOrestaurar snapshot viejo; cambiarúnicamente camposhero yCTA/beneficios autorizados, preservandootroscambios. VerificarversionantespublicarconAPIyguardarhistorial.

Validación: suitebackend/seguridad/thumbnail; ChromeWebGLrealconSwiftShader(laboratorio),360/390/430/1440; fallbacksinWebGL/reducedmotion, scrollpause/backtotop, archivado/restore/merge enDBlocalaislada, carritoWhatsAppmock sinenviar. PR+CIydeployverificado; no prueba destructiva enproductivo.
