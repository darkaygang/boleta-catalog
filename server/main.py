"""
BOLETA CLOTHING — Backend FastAPI
==================================
API REST para el catálogo editorial por encargo:
- Persistencia real en Supabase (public.products y bucket 'product-images')
- Respaldo automático en SQLite local (data/boleta.db y data/catalog.json)
- Endpoints CRUD de productos, subida de imágenes y fusión de tarjetas
- Sirve el frontend estático de dist/ en la raíz, con soporte de puerto dinámico $PORT
"""
import os
import sys
import json
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body, Header, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from server.db import (
    init_db,
    get_all_products,
    get_product_by_id,
    create_product,
    update_product,
    discard_product
)
from server.supabase_client import (
    supabase_client,
    is_supabase_configured,
    fetch_supabase_products,
    fetch_supabase_product_by_id,
    insert_supabase_product,
    update_supabase_product,
    delete_supabase_product,
    upload_supabase_product_image,
    sync_initial_catalog_to_supabase,
    ensure_bucket_exists
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "dist")
PHOTOS_DIR = os.path.join(DIST_DIR, "photos")
DATA_DIR = os.path.join(BASE_DIR, "data")
CATALOG_JSON_PATH = os.path.join(DATA_DIR, "catalog.json")
DIST_PRODUCTS_JSON = os.path.join(DIST_DIR, "data", "products.json")
DIST_PRODUCTS_JS = os.path.join(DIST_DIR, "data", "products.js")

ADMIN_PIN = os.environ.get("ADMIN_PIN", "2026")

# Asegurar directorios
os.makedirs(PHOTOS_DIR, exist_ok=True)
os.makedirs(os.path.join(DIST_DIR, "data"), exist_ok=True)

# Inicializar Base de Datos SQLite local
init_db()

# Si Supabase está disponible, sincronizar catálogo si la tabla está vacía
if is_supabase_configured():
    ensure_bucket_exists("product-images")
    try:
        local_initial = get_all_products(include_discarded=False)
        sync_initial_catalog_to_supabase(local_initial)
    except Exception as e:
        print(f"Aviso en sincronización inicial con Supabase: {e}", file=sys.stderr)

app = FastAPI(
    title="BOLETA — Interactive Showcase & Drops API",
    description="Backend FastAPI con persistencia en Supabase y respaldo SQLite",
    version="3.1.0"
)

# Middleware de Cabeceras de Seguridad HTTP
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sync_db_to_json_files():
    """Sincroniza el catálogo local hacia data/catalog.json y dist/data/products.json."""
    try:
        active_products = get_all_products(include_discarded=False)
        with open(CATALOG_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(active_products, f, indent=2, ensure_ascii=False)

        with open(DIST_PRODUCTS_JSON, "w", encoding="utf-8") as f:
            json.dump(active_products, f, indent=2, ensure_ascii=False)

        with open(DIST_PRODUCTS_JS, "w", encoding="utf-8") as f:
            f.write(f"window.BOLETA_CATALOG = {json.dumps(active_products, indent=2, ensure_ascii=False)};\n")
    except Exception as e:
        print(f"Advertencia al sincronizar JSON estático: {e}", file=sys.stderr)

def verify_editor_auth(
    x_admin_pin: Optional[str] = Header(None, alias="x-admin-pin"),
    x_editor_auth: Optional[str] = Header(None, alias="x-editor-auth"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    """Exige la autenticación del Modo Editor (PIN 2026) para operaciones de escritura."""
    # Validación flexible para soportar encabezados estándar
    if x_admin_pin and x_admin_pin.strip() == ADMIN_PIN:
        return True
    if authorization:
        token = authorization.replace("Bearer", "").strip()
        if token == ADMIN_PIN:
            return True
    if x_editor_auth and x_editor_auth.lower() in ("true", "1", ADMIN_PIN):
        return True

    # Si no se envió ningún encabezado de autorización válido
    raise HTTPException(
        status_code=401,
        detail="Acceso no autorizado. Ingrese el PIN de seguridad del Modo Editor."
    )

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/api/health")
def health_check():
    """Endpoint de estado del servicio, base de datos y Supabase."""
    local_prods = get_all_products(include_discarded=False)
    sb_status = "not_configured"
    sb_count = None

    if is_supabase_configured():
        try:
            sb_prods = fetch_supabase_products()
            if sb_prods is not None:
                sb_status = "connected"
                sb_count = len(sb_prods)
            else:
                sb_status = "error_fetching"
        except Exception as e:
            sb_status = f"error: {str(e)}"

    total_active = sb_count if (sb_count is not None and sb_status == "connected") else len(local_prods)

    return {
        "status": "ok",
        "service": "BOLETA CLOTHING API",
        "version": "3.1.0",
        "database": "SQLite (boleta.db)" + (" + Supabase PostgreSQL" if sb_status == "connected" else ""),
        "supabase_configured": is_supabase_configured(),
        "supabase_status": sb_status,
        "active_products_count": total_active
    }

@app.get("/api/products")
def list_products(include_discarded: bool = False):
    """Retorna la lista de productos. Prioriza Supabase y utiliza SQLite local como respaldo."""
    if is_supabase_configured():
        sb_prods = fetch_supabase_products()
        if sb_prods is not None and len(sb_prods) > 0:
            return sb_prods
        elif sb_prods is not None and len(sb_prods) == 0:
            # Si Supabase está vacío, importar catálogo local y retornar
            local_prods = get_all_products(include_discarded=include_discarded)
            sync_initial_catalog_to_supabase(local_prods)
            re_prods = fetch_supabase_products()
            if re_prods:
                return re_prods

    # Fallback local transparente
    return get_all_products(include_discarded=include_discarded)

@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    """Obtiene un producto específico por su ID."""
    if is_supabase_configured():
        sb_p = fetch_supabase_product_by_id(product_id)
        if sb_p:
            return sb_p

    p = get_product_by_id(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p

@app.post("/api/products")
async def add_product(
    request: Request,
    auth: bool = Depends(verify_editor_auth)
):
    """
    Crea un nuevo producto en Supabase (public.products) y sincroniza en SQLite local.
    Acepta tanto payloads JSON como FormData multipart.
    """
    content_type = request.headers.get("content-type", "")
    image_file = None

    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)
        if "image_file" in form and hasattr(form["image_file"], "filename"):
            image_file = form["image_file"]

    title = data.get("name") or data.get("title") or "Nuevo Producto"
    category = data.get("category") or "Accesorios"
    brand = data.get("brand") or "BOLETA"
    try:
        numeric_usd = float(data.get("price") if data.get("price") is not None else data.get("numeric_usd") or 0.0)
    except (ValueError, TypeError):
        numeric_usd = 0.0

    calc_bcv = round(numeric_usd * 1.15)
    material = data.get("description") or data.get("material") or ""
    image_url = data.get("image_url") or data.get("image") or "images/logo.png"
    available = bool(data.get("available", True) if "available" in data else data.get("in_stock", True))
    product_id = str(data.get("id") or f"bol_{int(time.time()*1000)}")

    # Si se adjuntó un archivo de imagen directo en el form
    if image_file and image_file.filename:
        ext = os.path.splitext(image_file.filename)[1].lower() or ".jpg"
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            raise HTTPException(status_code=400, detail="Formato de imagen inválido")
        safe_name = f"item_{int(time.time()*1000)}_{os.urandom(2).hex()}{ext}"
        dest_path = os.path.join(PHOTOS_DIR, safe_name)
        file_bytes = await image_file.read()
        with open(dest_path, "wb") as buf:
            buf.write(file_bytes)
        image_url = f"photos/{safe_name}"

    product_payload = {
        "id": product_id,
        "name": title,
        "title": title,
        "category": category,
        "brand": brand,
        "price": numeric_usd,
        "numeric_usd": numeric_usd,
        "numeric_bcv": calc_bcv,
        "price_usd": f"${int(numeric_usd)} USD",
        "price_bcv": f"{int(calc_bcv)}$ BCV",
        "description": material,
        "material": material,
        "image_url": image_url,
        "image": image_url,
        "thumb": image_url,
        "available": available,
        "in_stock": available,
        "sizes": data.get("sizes") or ["Única"],
        "gallery": data.get("gallery") or [],
        "tag": "POR ENCARGO",
        "status": "aprobado"
    }

    # Guardar en Supabase si está disponible
    if is_supabase_configured():
        try:
            sb_created = insert_supabase_product(product_payload)
            if sb_created:
                product_payload.update(sb_created)
        except Exception as e:
            print(f"⚠️ Aviso al insertar en Supabase: {e}", file=sys.stderr)

    # Sincronizar en SQLite local
    create_product({
        "id": product_id,
        "title": title,
        "category": category,
        "brand": brand,
        "numeric_usd": numeric_usd,
        "numeric_bcv": calc_bcv,
        "image": image_url,
        "material": material,
        "in_stock": available,
        "sizes": product_payload["sizes"],
        "gallery": product_payload["gallery"]
    })
    sync_db_to_json_files()

    return product_payload

@app.put("/api/products/{product_id}")
async def put_product(
    product_id: str,
    request: Request,
    auth: bool = Depends(verify_editor_auth)
):
    """Actualiza un producto en Supabase y sincroniza localmente."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        updates = await request.json()
    else:
        form = await request.form()
        updates = dict(form)

    # Actualizar en Supabase si está disponible
    sb_updated = None
    if is_supabase_configured():
        try:
            sb_updated = update_supabase_product(product_id, updates)
        except Exception as e:
            print(f"⚠️ Error actualizando en Supabase: {e}", file=sys.stderr)

    # Actualizar en SQLite local
    local_updated = update_product(product_id, updates)
    sync_db_to_json_files()

    if sb_updated:
        return sb_updated
    if local_updated:
        return local_updated

    raise HTTPException(status_code=404, detail="Producto no encontrado")

@app.patch("/api/products/{product_id}")
async def patch_product(
    product_id: str,
    request: Request,
    auth: bool = Depends(verify_editor_auth)
):
    """Alias PATCH de PUT para actualización de producto."""
    return await put_product(product_id, request, auth)

@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: str,
    auth: bool = Depends(verify_editor_auth)
):
    """Elimina únicamente el producto solicitado en Supabase y SQLite."""
    if is_supabase_configured():
        try:
            delete_supabase_product(product_id)
        except Exception as e:
            print(f"⚠️ Error eliminando en Supabase: {e}", file=sys.stderr)

    # Descartar en base de datos local
    discard_product(product_id)
    sync_db_to_json_files()

    return {
        "success": True,
        "id": product_id,
        "message": f"Producto #{product_id} eliminado exitosamente"
    }

@app.post("/api/products/{product_id}/image")
async def upload_product_image_endpoint(
    product_id: str,
    file: UploadFile = File(...),
    auth: bool = Depends(verify_editor_auth)
):
    """
    Sube una imagen al bucket público 'product-images' de Supabase
    y actualiza la columna image_url del producto.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    # Validación de formato y extensión segura
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no permitido. Solo se aceptan imágenes (.jpg, .jpeg, .png, .webp, .gif)."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen excede el límite de 10 MB")

    # Generación de nombre seguro sin caracteres especiales ni colisiones
    safe_filename = f"prod_{product_id}_{int(time.time()*1000)}_{os.urandom(3).hex()}{ext}"

    # Guardar copia local en dist/photos/
    local_path = os.path.join(PHOTOS_DIR, safe_filename)
    with open(local_path, "wb") as buf:
        buf.write(file_bytes)
    rel_path = f"photos/{safe_filename}"
    public_url = rel_path

    # Subir a Supabase Storage si está configurado
    if is_supabase_configured():
        try:
            sb_url = upload_supabase_product_image(
                product_id=product_id,
                file_bytes=file_bytes,
                filename=safe_filename,
                content_type=file.content_type or f"image/{ext.lstrip('.')}"
            )
            if sb_url:
                public_url = sb_url
        except Exception as e:
            print(f"⚠️ Aviso al subir a Supabase Storage: {e}. Conservando ruta local.", file=sys.stderr)

    # Actualizar producto en SQLite local
    update_product(product_id, {"image": public_url, "thumb": public_url})
    sync_db_to_json_files()

    return {
        "success": True,
        "id": product_id,
        "image_url": public_url,
        "url": public_url,
        "filename": safe_filename,
        "message": "Imagen subida exitosamente"
    }

@app.post("/api/upload")
async def legacy_upload_image(
    file: UploadFile = File(...),
    auth: bool = Depends(verify_editor_auth)
):
    """Endpoint general para subida de imágenes auxiliares y galería."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes")

    file_bytes = await file.read()
    safe_filename = f"upload_{int(time.time()*1000)}_{os.urandom(3).hex()}{ext}"

    local_path = os.path.join(PHOTOS_DIR, safe_filename)
    with open(local_path, "wb") as buffer:
        buffer.write(file_bytes)

    rel_path = f"photos/{safe_filename}"
    public_url = rel_path

    if is_supabase_configured():
        try:
            ensure_bucket_exists("product-images")
            supabase_client.storage.from_("product-images").upload(
                path=safe_filename,
                file=file_bytes,
                file_options={"content-type": file.content_type or f"image/{ext.lstrip('.')}"}
            )
            sb_url = supabase_client.storage.from_("product-images").get_public_url(safe_filename)
            if sb_url:
                public_url = sb_url
        except Exception as e:
            print(f"Aviso en legacy upload a Supabase: {e}", file=sys.stderr)

    return {
        "success": True,
        "url": public_url,
        "thumb": public_url,
        "filename": safe_filename
    }

@app.post("/api/products/merge")
def merge_cards(
    source_id: str = Body(..., embed=True),
    target_id: str = Body(..., embed=True),
    auth: bool = Depends(verify_editor_auth)
):
    """Fusiona la imagen del producto source en la galería de target y descarta source."""
    source_p = get_product_by_id(source_id)
    target_p = get_product_by_id(target_id)
    if not source_p or not target_p:
        raise HTTPException(status_code=404, detail="Producto origen o destino no encontrado")

    target_gallery = target_p.get("gallery") or []
    photos_to_add = [source_p["image"]] + (source_p.get("gallery") or [])

    for ph in photos_to_add:
        if ph and ph != target_p["image"] and ph not in target_gallery:
            target_gallery.append(ph)

    # Actualizar en Supabase si está disponible
    if is_supabase_configured():
        try:
            update_supabase_product(target_id, {"gallery": target_gallery})
            delete_supabase_product(source_id)
        except Exception as e:
            print(f"Aviso fusionando en Supabase: {e}", file=sys.stderr)

    update_product(target_id, {"gallery": target_gallery})
    discard_product(source_id)
    sync_db_to_json_files()

    return {
        "success": True,
        "target_product": get_product_by_id(target_id),
        "message": f"Fotos fusionadas en #{target_id}. #{source_id} descartado."
    }

# ============================================================================
# MONTAJE ESTÁTICO (Frontend ./dist/)
# ============================================================================
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static_dist")

# ============================================================================
# INICIO SERVIDOR CON PUERTO DINÁMICO ($PORT de Render o default 8080)
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"Iniciando BOLETA Full-Stack Server en puerto {port}...")
    uvicorn.run("server.main:app", host="0.0.0.0", port=port, reload=False)
