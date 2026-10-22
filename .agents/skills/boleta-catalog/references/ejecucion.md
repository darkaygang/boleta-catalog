# Implementación y aceptación
Antes de editar: Git status/remotos, instrucciones repo y SDD, rama, respaldo verificable de datos/medios. Conservar cambios ajenos.
Reparar autenticación servidor, sesiones protegidas, autorización en writes, límites de intentos; quitar bypass y secretos frontend.
Persistencia canónica de productos, variantes, gallery y settings. Fallo remoto no debe informar publicación exitosa ni divergir silenciosamente a SQLite.
Settings versionados: borrador/publicado/historial/reversión, fuentes de lista permitida, contenido/enlaces validados.
Inventario por variante y estado logístico separado del comercial; transacciones para reservas automáticas, mientras tanto confirmación manual.
Storage durable validado, imágenes responsivas y miniaturas; no depender de disco efímero.
Editor: seleccionar bloque, editar frase/fuente/fotos, preview móvil y ambos temas, guardar borrador, publicar y revertir. No editar código.
Guía contextual con FAQ editables aprobadas, acceso humano y preguntas sin respuesta para revisión humana. No prometer aprendizaje autónomo ni datos inventados.
Spotify bajo demanda; autorizar origen específico del iframe en CSP.
Animación CSS transform/opacity preferida, reduced-motion. Video opcional si hay material autorizado y valor, poster/carga diferida/controles; no generador de video disponible en esta sesión.
Analítica: view_product/select_variant/add_to_selection/whatsapp_click/faq_open/radio_open/studio_contact_click; no PII. Clic WhatsApp no acredita conversación, reconciliar con pedido.
Objetivos propuestos: LCP<=2.5s, CLS<=0.1, INP<=200ms; distinguir campo/laboratorio. Presupuesto inicial <=1MB antes de interacción, sin Spotify ni video inicial; revisar con fotos reales.
Validar con DB temporal y remoto simulado: auth, persistencia recarga/reinicio, settings rollback, galería/fusión/archivo, variantes, tasa fechada y mensaje WhatsApp.
Revisar 360/390/430px sin overflow, ambos temas, teclado/foco/contraste, targets>=44px, alt, reduced-motion, CSP y errores remotos.
No afirmar tests o despliegue sin evidencia. Preview/PR revisable antes de producción conforme autorización vigente.
