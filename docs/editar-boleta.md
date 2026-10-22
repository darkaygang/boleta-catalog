# Editar BOLETA sin código
## Entrar
Abre la web y pulsa **Editar página** al pie, o usa /?editor. La contraseña se configura en ADMIN_PASSWORD del servidor, no aparece en el código público. En móvil la barra de edición permanece arriba y el panel se coloca debajo.

## Contenido y diseño
Personalizar abre Contenido, Estilo, Fotos, Secciones, Guía, Piezas, Historial, Métricas y Contactos.
- Contenido: frases del hero, archivo, radio, cómo encargar y comunidad; fecha y nota logística; contactos, playlist y agencia; tasa BCV fechada y anticipo opcional.
- Estilo: fuentes permitidas y color principal, vista clara/oscura y móvil.
- Fotos: logo, lentes y anillo de portada; sube imágenes propias.
- Secciones: flechas para cambiar orden y controles de visibilidad. Hero/header/footer y catálogo permanecen como estructura esencial.
- Guía: preguntas y respuestas que tú apruebas, añadir/quitar; no inventa respuestas.
- Logo Digital Solution: pestaña Imágenes, seleccionar archivo; revisar borrador y publicar.
- Ruleta retirada por solicitud del propietario el 22/10; no aparece en el editor.
Puedes tocar **Editar bloque** en la página para ir al panel correspondiente.

## Guardar y publicar
Escribir cambia tu vista previa privada.
**Guardar borrador** conserva la versión en servidor y no modifica la web de clientes.
**Publicar** pide confirmación y conserva historial.
**Historial** carga una versión anterior en el borrador; debes publicarla para que sea visible.
Las ediciones de productos se aplican directamente al guardarlas: su formulario lo indica. No se confunden con el borrador del diseño.

## Productos
Piezas -> Nueva pieza o Editar.
Título, categoría, precio, descripción, imágenes, tallas/variantes y cantidades.
Las fotos se pueden subir y ordenar. Foto principal y galería son distintas.
Una variante puede tener precio propio; cantidad cero no se puede añadir.
Archivar oculta una pieza sin perderla; Restaurar la recupera.
Fusionar fotografías pide confirmación y preserva la galería. No significa que dos tallas sean el mismo inventario.

## Pedidos
El visitante arma una selección y genera la consulta WhatsApp con producto, variante, cantidad y precios de referencia.
La consulta no confirma pago, compra o reserva automática. Confirma inventario, condiciones y anticipo por tu canal antes de cobrar.
Si no hay precio/tasa o una variante se retiró, se muestra pendiente de confirmar. La llegada es estimada.

## Contactos y métricas
Contactos permite exportar CSV privado y eliminar datos ante solicitud.
Solo contactos con **marketing_consent = sí** pueden recibir promociones.
El consentimiento promocional sigue siendo opcional y separado de la compra. No hay ruleta ni premios activos.
Las estadísticas son eventos agregados de visitantes que activaron medición. Clics WhatsApp no prueban conversaciones enviadas, ni representan pagos.
El código no envía promociones automáticamente.

## Radio y guía
Spotify se carga solo al pulsar Escuchar; cerrar retira el iframe.
El guía ofrece un recorrido y respuestas editables, con salida a WhatsApp.
Los fondos son una sorpresa digital gratuita; límite por navegador/cookie, no verificación de identidad.

## Protección
No compartir contraseña, keys ni CSV de contactos en GitHub. Usa export y backups de Supabase. Antes de cambiar el hosting comprueba que persista boleta_state y Storage.
