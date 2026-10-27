# Tu catálogo BOLETA · Vitrina Cromada

## Entrar a editar
Abre https://boleta-catalog.onrender.com/?editor e introduce la contraseña que elegiste. También puedes pulsar **Editar página** al pie. La clave se guarda en el servidor de Render; no está incluida en el código público.

## Cambiar textos, colores y portada
1. Pulsa **Personalizar**.
2. **Contenido**: frases, contactos, fecha estimada, playlist y condiciones comerciales.
3. **Estilo**: fuente del hero, encabezados, texto general, color y vista móvil/clara/oscura.
4. **Fotos**: logo BOLETA, fondo cromado, lentes y anillo del hero, logo Digital Solution.
5. **Guardar borrador** conserva cambios privados. **Publicar** los hace visibles. **Historial** permite cargar una versión anterior y volver a publicarla.

## Organizar tu compra nueva
En **Productos** o **Piezas**, abre cada ficha y revisa nombre, precio, talla/variante, cantidad e imágenes. Puedes subir y ordenar tus fotos QC sin editar código. Archiva lo que ya no ofreces; fusiona fotos solo cuando pertenecen a la misma pieza. Las modificaciones de productos se aplican al guardarlas, como indica el formulario; son distintas del borrador de diseño.

La portada es una composición publicitaria. Las fichas mantienen fotos QC reales. No se han cambiado las fotos de todos los productos para hacerlas parecer sesiones profesionales.

## Cómo encarga un cliente
Busca o filtra, abre una pieza, elige variante y cantidad y añade a su selección. En el carrito puede ajustar cantidades o quitar piezas. **Consultar por WhatsApp** prepara el mensaje con su selección. Confirma disponibilidad, precio final, envío y condiciones antes de cobrar; el clic no confirma un pago ni reserva.

## Qué debes revisar tú
- Que las piezas compradas, variantes, unidades y precios correspondan a tu pedido real.
- La fecha estimada de llegada y cualquier cambio logístico.
- Tus condiciones de anticipo/cancelación y tasa fechada si cobras en bolívares.
- Las respuestas del guía y la playlist.

Métricas y contactos son privados dentro del editor. El consentimiento para promociones es opcional y separado. La página no envía campañas automáticamente.

No necesitas ejecutar SQL: la migración privada del editor ya se aplicó en Supabase. El catálogo anterior y sus120productos se conservaron. La contraseña administrativa puede cambiarse después en **Render → boleta-catalog → Environment → ADMIN_PASSWORD**; guarda y despliega el cambio.


## Edición visual25/10
Entra al editor y cierra el panel lateral con × para recorrer el catálogo. Cada tarjeta tiene Editar, Quitar publicación yUnir fotos. Quitar oculta la pieza sinborrar susdatos; se restaura desde Productos/Piezas con miniaturas.
En escritorio arrastra una tarjeta sobre otra; en móvil pulsa Unirfotos y toca el destino. La confirmación muestra ambos productos: el destino recibe fotos y conserva precio/tallas/stock; el origen searchiva. Solo unir fotografías delmismoartículo, no variantes distintas.
Contenido incluye losbeneficios deDigitalSolution. Fotos permitecambiar elambiente yposter sin3D; elposter no sustituye laescultura real en dispositivos compatibles. Estilo mantiene fuenteheroindependiente. SinWebGL/movimientoreducido/ahorrodatos usa imagenalternativa. No hacefaltaWebGLpara comprar.


## Sold out (26/10)
Entra al editor y cierra el panel con × para ver los controles sobre cada pieza. «Marcar sold out» mantiene la publicación visible, muestra SOLD OUT y deshabilita encargar. Los agotados aparecen al final de Todos. «Marcar disponible» revierte ese estado. También está la casilla Sold out dentro de Editar. «Quitar publicación» sigue siendo una acción distinta: archiva y oculta. Los cambios de producto se guardan al aplicarlos; no requieren publicar el diseño.

## Enlaces compartidos
El favicon del navegador y la imagen para WhatsApp/Telegram son elementos distintos. Se incluyen iconos y una imagen OG JPG1200×630 en el HTML inicial. Las aplicaciones pueden mantener una vista previa anterior en su caché; esto no implica que la nueva imagen haya fallado.

## Imágenes y memoria
Las fotos nuevas se guardan en Supabase Storage, con WebP de hasta1600px y una miniatura separada. Se conservan los originales del propietario. El servidor limita las conversiones simultáneas; no aumentar workers en una instancia pequeña sin medir la memoria, porque el límite es por proceso. Benchmark reproducible: python scripts/benchmark_image_memory.py (laboratorio aislado).


## Tasas y anticipo
En Personalizar → Contenido → Condiciones comerciales puedes cambiar el porcentaje de anticipo, tasaBCV, tasaUSDT, fecha de cada tasa y modo de conversión. Guarda borrador y publica.
El modo «USD base × USDT; referencia USD aBCV» calcula Bs=precioUSD×tasaUSDT y la referenciaUSD aBCV=Bs/tasaBCV. Con1005y887.30,30USD son30150Bs y33.98USD de referenciaBCV. La referencia no es un cargo adicional. Las tasas son las configuradas por la tienda, con fecha; no hay actualización automática.
Anticipo50%de una cotización completa de30USD:15USDbase o15075Bs aesas tasas. Si falta algún precio o disponibilidad, el anticipo completo queda por confirmar. Los precios de variantes y las cantidades se incluyen en el cálculo. Confirma condiciones y monto final porWhatsApp antes de recibir el abono, incluido qué sucede si cambia la tasa del saldo.


## Precios visibles en dolares
El catalogo muestra precio USD y Ref. BCV en USD, sin importes Bs en las tarjetas, detalle, carrito o mensaje de encargo. Ejemplo: $30,00 USD y Ref. BCV: $33,98 USD con las tasas configuradas el26/10. La referencia no se suma al precio base. Anticipo y saldo muestran las mismas dos alternativas. El editor conserva las tasas para actualizar el calculo.

