# BOLETA Estudio Interactivo — aprobado 21/10/2026
Extiende specs/catalogo-telegram. Sustituye reglas históricas incompatibles (PIN público, abono 50% fijo, tasa ficticia, colores anteriores). Diseño C con bloque guía A, fotos reales actuales y nueva mascota solo con un tattoo debajo de ojo izquierdo. Se conserva FastAPI y frontend ligero: prompt React era referencia de animaciones, no orden de migrar.

RF-20: El sistema deberá ofrecer tema claro/oscuro, conservar elección y respetar reduced-motion.
RF-21: CUANDO el cliente pida ayuda, el guía ofrecerá tutorial contextual de explorar, elegir variante, selección y consulta WhatsApp. Consulta no confirma pago/reserva.
RF-22: La introducción no retrasará artificialmente el acceso; transición breve y retirada con o sin JS. Ninguna descarga Spotify/video en carga inicial.
RF-23: DONDE haya campaña activa con premios/condiciones reales, la ruleta opcional adjudicará premio desde servidor, con idempotencia y sin premio ficticio. Si no hay campaña configurada no prometer descuento.
RF-24: El formulario sin registro recogerá nombre y WhatsApp con consentimiento promocional separado no preseleccionado. Rechazo no impedirá comprar ni usar guía. Leads privados/export admin, baja por WhatsApp y sin PII analítica.
RF-25: El editor autenticado permitirá editar fuentes permitidas, frases, colores, fotos, secciones, FAQ, playlist y contactos con borrador/preview/publicación/reversión persistente.
RF-26: El backend rechazará bypass de sesión, persistirá galerías/tallas/settings completos y no informará éxito de escrituras remotas fallidas.
RF-27: La radio cargará iframe oficial Spotify únicamente tras clic; estado UI no fingirá reproducción real.
RF-28: El encargo generará WhatsApp con códigos, productos, variantes, cantidades, precio confirmado/pendiente, fecha estimada, tasa fechada cuando exista y condiciones aprobadas; nunca aplicará abono no configurado.
RF-29: Estadísticas privadas contarán eventos agregados; clic WhatsApp se distingue de conversación y pago. Promociones solo contactos con consentimiento.
RF-30: Digital Solution tendrá sección/contacto B2B independiente (repo verificado), sin promesas de resultados inventadas.
RF-31: El catálogo debe ser usable a 360/390/430px, teclado/foco/alt, targets >=44px, sin overflow; imágenes responsivas y módulos progresivos.
RF-32: El diseño original del guía debe preservarse; solo se añade un tattoo pequeño bajo su ojo izquierdo.
