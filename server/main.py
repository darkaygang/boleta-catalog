"""
BOLETA CLOTHING — Backend FastAPI
==================================
API REST para el catálogo editorial por encargo:
- SQLite (data/boleta.db) inicializada automáticamente desde data/catalog.json
- Endpoints CRUD de productos, subida de imágenes a dist/photos/ y fusión de tarjetas
- Sirve el frontend estático de dist/ en la raíz, con soporte de puerto dinámico $PORT
"""
import os
import sys
import json
import time
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from server.db import (
    init_db,
    get_all_products,
    get_product_by_id,
    create_product,
    update_product,
    discard_product
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "dist")
PHOTOS_DIR = os.path.join(DIST_DIR, "photos")
DATA_DIR = os.path.join(BASE_DIR, "data")
CATALOG_JSON_PATH = os.path.join(DATA_DIR, "catalog.json")
DIST_PRODUCTS_JSON = os.path.join(DIST_DIR, "data", "products.json")
DIST_PRODUCTS_JS = os.path.join(DIST_DIR, "data", "products.js")

# Asegurar directorios
os.makedirs(PHOTOS_DIR, exist_ok=True)
os.makedirs(os.path.join(DIST_DIR, "data"), exist_ok=True)

# Inicializar Base de Datos SQLite
init_db()

app = FastAPI(
    title="BOLETA — Interactive Showcase & Drops API",
    description="Backend FastAPI con SQLite para catálogo editorial, subida de medios y pedidos",
    version="2.0.0"
)

# CORS Middleware para desarrollo y despliegues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sync_db_to_json_files():
    """Sincroniza el catálogo de SQLite hacia data/catalog.json y dist/data/products.json."""
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

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/api/health")
def health_check():
    prods = get_all_products(include_discarded=False)
    return {
        "status": "ok",
        "service": "BOLETA CLOTHING API",
        "database": "SQLite (boleta.db)",
        "active_products_count": len(prods)
    }

@app.get("/api/products")
def list_products(include_discarded: bool = False):
    """Retorna la lista de productos almacenados en SQLite."""
    return get_all_products(include_discarded=include_discarded)

@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    p = get_product_by_id(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Guarda una imagen subida en dist/photos/ y retorna la ruta relativa."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    # Limpiar y renombrar para evitar colisiones
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    safe_filename = f"upload_{int(time.time()*1000)}_{os.urandom(3).hex()}{ext}"
    dest_path = os.path.join(PHOTOS_DIR, safe_filename)

    with open(dest_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    rel_path = f"photos/{safe_filename}"
    return {
        "success": True,
        "url": rel_path,
        "thumb": rel_path,
        "filename": safe_filename
    }

@app.post("/api/products")
async def add_product(
    title: str = Form(...),
    category: str = Form("Accesorios"),
    brand: str = Form("BOLETA"),
    numeric_usd: float = Form(0.0),
    numeric_bcv: Optional[float] = Form(None),
    material: str = Form(""),
    sizes: str = Form("Única"),
    tag: str = Form("Por encargo"),
    image_file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None)
):
    """Crea un nuevo producto en la base de datos SQLite y guarda su imagen."""
    image_path = ""
    if image_file and image_file.filename:
        ext = os.path.splitext(image_file.filename)[1].lower() or ".jpg"
        safe_name = f"item_{int(time.time()*1000)}_{os.urandom(2).hex()}{ext}"
        dest_path = os.path.join(PHOTOS_DIR, safe_name)
        with open(dest_path, "wb") as buf:
            buf.write(await image_file.read())
        image_path = f"photos/{safe_name}"
    elif image_url:
        image_path = image_url
    else:
        # Foto placeholder si no se proporcionó
        image_path = "images/logo.png"

    calc_bcv = numeric_bcv if numeric_bcv is not None else round(numeric_usd * 1.15)

    # Procesar tallas
    sizes_list = [s.strip() for s in sizes.split(",") if s.strip()]
    if not sizes_list:
        sizes_list = ["Única"]

    prod_dict = {
        "title": title.strip(),
        "category": category.strip(),
        "brand": brand.strip(),
        "numeric_usd": numeric_usd,
        "numeric_bcv": calc_bcv,
        "price_usd": f"${int(numeric_usd)} USD",
        "price_bcv": f"{int(calc_bcv)}$ BCV",
        "image": image_path,
        "thumb": image_path,
        "gallery": [],
        "sizes": sizes_list,
        "material": material.strip(),
        "tag": tag.strip(),
        "is_purchased": False,
        "in_stock": True,
        "status": "aprobado"
    }

    new_prod = create_product(prod_dict)
    sync_db_to_json_files()
    return new_prod

@app.patch("/api/products/{product_id}")
async def patch_product(product_id: str, updates: dict = Body(...)):
    """Actualiza campos específicos de un producto (ej. is_purchased, in_stock, precio)."""
    updated = update_product(product_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    sync_db_to_json_files()
    return updated

@app.put("/api/products/{product_id}")
async def put_product(product_id: str, updates: dict = Body(...)):
    """Alias PUT de PATCH para actualización completa de un producto."""
    updated = update_product(product_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    sync_db_to_json_files()
    return updated

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str):
    """Marca un producto como descartado en SQLite."""
    res = discard_product(product_id)
    if not res:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    sync_db_to_json_files()
    return {"success": True, "message": f"Producto #{product_id} descartado"}

@app.post("/api/products/merge")
def merge_cards(source_id: str = Body(..., embed=True), target_id: str = Body(..., embed=True)):
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
