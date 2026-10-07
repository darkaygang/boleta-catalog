# Guía del agente

## Proyecto
BOLETA CATÁLOGO, independiente de BDV Gold.

## Arquitectura
- Importación y generación locales: Python 3.
- Parser HTML: BeautifulSoup si no está ya disponible.
- Dependencias Python en entorno virtual local .venv.
- Frontend: HTML5, CSS y JavaScript vanilla (o Vite bundle para animaciones óptimas).
- Datos públicos saneados: catálogo generado.
- Revisión privada: archivo editable y página local de revisión.
- Carrito: localStorage, sin datos personales.
- WhatsApp: click-to-chat, mensaje codificado con encodeURIComponent.
- Publicación: archivos estáticos; instrucciones para Cloudflare Pages.
- Stack interactivo: bundle estático moderno (Vite + Vanilla JS/CSS o React minimal) para animaciones fluidas a 60fps.

## Rutas
- Fuente: ./ChatExport_2026-10-06/
- Scripts: ./scripts/
- Configuración privada: ./config/
- Datos/revisión privados: ./data/
- Revisión visual local: ./review/
- Pruebas: ./tests/
- Resultado público: ./dist/

## Flujo
1. Leer constitución, memoria, skill y especificación.
2. Inspeccionar entrada.
3. Importar candidatos con evidencia y confianza.
4. Generar revisión local.
5. Esperar aprobación del propietario cuando corresponda.
6. Generar catálogo aprobado.
7. Ejecutar pruebas.
8. Actualizar tareas y memoria.

## Comandos previstos, a implementar en la fase de ejecución
- python -m venv .venv
- .\.venv\Scripts\python.exe -m pip install -r requirements.txt
- .\.venv\Scripts\python.exe scripts\import_catalog.py
- .\.venv\Scripts\python.exe scripts\build_catalog.py
- .\.venv\Scripts\python.exe -m unittest discover -s tests
- .\.venv\Scripts\python.exe -m http.server 8080 --bind 127.0.0.1 --directory review
- .\.venv\Scripts\python.exe -m http.server 8081 --bind 127.0.0.1 --directory dist

Los comandos son planificados, no resultados ya comprobados.
No iniciar servidores públicos ni desplegar remotamente sin autorización.

## Contexto y checkpoints
Actualizar MEMORY.md tras cada fase y antes de detenerse.
No marcar tareas terminadas sin evidencia.
Preservar aprobaciones y correcciones del propietario al reimportar.
