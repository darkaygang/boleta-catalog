# Activar el rediseño en Render
La preview fue construida y probada localmente. No confundir PR con despliegue público.

## Antes del cambio
1. Exportar/resguardar public.products y objetos de product-images del proyecto real. El respaldo local de esta tarea solo conserva la versión pública; no contiene pedidos privados ni equivale a un backup integral de producción.
2. En Supabase SQL Editor del proyecto existente, ejecutar docs/supabase-redesign.sql. Es aditivo: crea boleta_state y RPC privada, conserva tabla products y medios.
3. Mantener SUPABASE_URL y la clave de servicio únicamente en variables del servidor. El backend reconoce SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_KEY; usar una clave de servicio privada, no anon.
4. Configurar ADMIN_PASSWORD con al menos 10 caracteres; usar contraseña nueva, no el antiguo PIN. No añadirla a Git.
5. Configurar BOLETA_ENV=production y BOLETA_PUBLIC_ORIGIN=https://boleta-catalog.onrender.com.
6. No activar BOLETA_ALLOW_LOCAL_STORAGE en disco efímero Render.
7. Usar un worker de uvicorn, como el comando actual. Conservar cron/monitor existente; no sustituye la persistencia.
8. Revisar el PR, desplegar preview/branch o fusionar cuando el entorno esté listo.

## Verificación de activación
- /api/health debe responder; esto solo comprueba liveness/configuración.
- Login privado, guardar un borrador, recargar y verificar persistencia; la web pública no debe cambiar hasta publicar.
- Comprobar publicación y recuperación del historial.
- Hacer consulta WhatsApp de prueba sin enviar mensaje, revisar texto y contactos.
- Spotify solo tras clic. Intro1→100 >=1s, guía completa y ausencia de ruleta; endpoint legado devuelve410.
- Formulario de contacto de prueba con consentimiento, verificar admin y eliminar dato de prueba.
- Si API responde snapshot o 503 al guardar, falta configuración/migración o falla conexión. No confirmar guardado si hay error.
- Verificar originales y galerías, tasa fechada, condiciones reales y listado nuevo comprado antes de aceptar anticipos.

## Modelo y reversión
La primera adopción toma los campos básicos del catálogo vivo Supabase y completa galerías/tallas por ID desde el snapshot del repo. No altera public.products.
Los nuevos cambios viven en boleta_state (JSONB privado + compare-and-swap). Roles anónimos no tienen permisos de lectura.
Si vuelves al servidor anterior, dejará de leer los cambios nuevos de boleta_state: exportar/adaptar antes de una reversión después de editar; no borrar estado para hacer rollback.
Sesiones administrativas y rate limits son por proceso: al reiniciar vuelve a iniciar sesión.
No se ha ejecutado la migración real en esta tarea: no hay sesión SQL/credenciales de administración disponibles aquí.

## Desarrollo Windows
python -m venv .venv
.\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt
Configurar BOLETA_ENV=development, BOLETA_ALLOW_LOCAL_STORAGE=1, BOLETA_DATA_DIR a carpeta local temporal y ADMIN_PASSWORD de desarrollo; no reutilizar una contraseña de producción.
.\\.venv\\Scripts\\python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8081
.\\.venv\\Scripts\\python.exe -m unittest discover -s tests -v
Tests usan directorios temporales y clientes remotos simulados. No dependen de credenciales de producción.
