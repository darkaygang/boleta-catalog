"""
BOLETA CLOTHING — Integración con Supabase
==========================================
Gestión de persistencia real en PostgreSQL (public.products)
y Storage (bucket público 'product-images') con fallback automático
hacia la base local (SQLite / catalog.json).

Columnas en Supabase:
- id: identificador único (string/int)
- name: nombre del producto (title)
- description: material / especificaciones
- price: valor numérico USD
- category: categoría (Joyería, Lentes, etc.)
- image_url: URL pública de la imagen
- available: disponibilidad en vitrina (booleano)
- created_at: fecha de creación ISO
- updated_at: fecha de última actualización ISO
"""
import os
import sys
import time
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SECRET_KEY = (
    os.environ.get("SUPABASE_SECRET_KEY", "").strip()
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    or os.environ.get("SUPABASE_KEY", "").strip()
)

supabase_client = None

def init_supabase_client(url: Optional[str] = None, key: Optional[str] = None):
    """Inicializa o reinicializa el cliente de Supabase si los parámetros están presentes."""
    global supabase_client, SUPABASE_URL, SUPABASE_SECRET_KEY
    if url:
        SUPABASE_URL = url.strip()
    if key:
        SUPABASE_SECRET_KEY = key.strip()

    if SUPABASE_URL and SUPABASE_SECRET_KEY:
        try:
            from supabase import create_client
            supabase_client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
            print("✓ Cliente Supabase inicializado correctamente.")
            return supabase_client
        except Exception as e:
            print(f"⚠️ Error inicializando cliente Supabase: {e}", file=sys.stderr)
            supabase_client = None
    else:
        supabase_client = None
    return supabase_client

# Intentar inicialización con variables de entorno del sistema
init_supabase_client()

def is_supabase_configured() -> bool:
    """Retorna True si Supabase cuenta con credenciales activas."""
    return supabase_client is not None

def ensure_bucket_exists(bucket_name: str = "product-images") -> bool:
    """Garantiza la existencia del bucket público para imágenes en Supabase."""
    if not supabase_client:
        return False
    try:
        supabase_client.storage.get_bucket(bucket_name)
        return True
    except Exception:
        try:
            supabase_client.storage.create_bucket(bucket_name, options={"public": True})
            print(f"✓ Bucket público '{bucket_name}' creado en Supabase.")
            return True
        except Exception as e:
            print(f"Nota: No se pudo verificar o crear el bucket '{bucket_name}': {e}", file=sys.stderr)
            return False

def supabase_to_frontend(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convierte un registro de public.products de Supabase al formato unificado de la vitrina."""
    if not row:
        return {}
    p_id = str(row.get("id") or "")
    price_val = float(row.get("price") or 0.0)
    bcv_val = round(price_val * 1.15)
    name = row.get("name") or row.get("title") or "Producto"
    desc = row.get("description") or ""
    category = row.get("category") or "Accesorios"
    img = row.get("image_url") or row.get("image") or "images/logo.png"
    available = bool(row.get("available", True))

    return {
        "id": p_id,
        "code": f"#BOL-{p_id[:8]}" if len(p_id) > 4 else f"#BOL-{p_id}",
        "title": name,
        "name": name,
        "category": category,
        "brand": "BOLETA",
        "price": price_val,
        "numeric_usd": price_val,
        "numeric_bcv": float(bcv_val),
        "price_usd": f"${int(price_val)} USD",
        "price_bcv": f"{int(bcv_val)}$ BCV",
        "image": img,
        "image_url": img,
        "thumb": img,
        "gallery": row.get("gallery") or [],
        "sizes": row.get("sizes") or ["Única"],
        "description": desc,
        "material": desc,
        "tag": "POR ENCARGO",
        "is_purchased": False,
        "in_stock": available,
        "available": available,
        "status": "aprobado",
        "created_at": str(row.get("created_at") or ""),
        "updated_at": str(row.get("updated_at") or "")
    }

def frontend_to_supabase(data: Dict[str, Any]) -> Dict[str, Any]:
    """Adapta un payload del frontend a las columnas de public.products en Supabase."""
    now_iso = datetime.now(timezone.utc).isoformat()
    row: Dict[str, Any] = {}

    if "id" in data and data["id"] is not None:
        row["id"] = str(data["id"])

    name = data.get("name") or data.get("title")
    if name is not None:
        row["name"] = str(name).strip()

    desc = data.get("description") or data.get("material")
    if desc is not None:
        row["description"] = str(desc).strip()

    price = data.get("price") if data.get("price") is not None else data.get("numeric_usd")
    if price is not None:
        try:
            row["price"] = float(price)
        except (ValueError, TypeError):
            row["price"] = 0.0

    if "category" in data and data["category"] is not None:
        row["category"] = str(data["category"]).strip()

    img = data.get("image_url") or data.get("image")
    if img is not None:
        row["image_url"] = str(img).strip()

    available = data.get("available") if data.get("available") is not None else data.get("in_stock")
    if available is not None:
        row["available"] = bool(available)

    if "created_at" in data and data["created_at"]:
        row["created_at"] = str(data["created_at"])

    row["updated_at"] = now_iso
    return row

def fetch_supabase_products() -> Optional[List[Dict[str, Any]]]:
    """Obtiene todos los productos activos de la tabla public.products en Supabase."""
    if not supabase_client:
        return None
    try:
        res = supabase_client.table("products").select("*").order("created_at", desc=False).execute()
        if res and hasattr(res, "data") and isinstance(res.data, list):
            return [supabase_to_frontend(r) for r in res.data]
        return []
    except Exception as e:
        print(f"⚠️ Error al consultar public.products en Supabase: {e}", file=sys.stderr)
        return None

def fetch_supabase_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    """Obtiene un producto específico por ID desde Supabase."""
    if not supabase_client:
        return None
    try:
        res = supabase_client.table("products").select("*").eq("id", str(product_id)).execute()
        if res and res.data and len(res.data) > 0:
            return supabase_to_frontend(res.data[0])
        return None
    except Exception as e:
        print(f"⚠️ Error al consultar producto #{product_id} en Supabase: {e}", file=sys.stderr)
        return None

def insert_supabase_product(product_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Inserta un nuevo producto en public.products."""
    if not supabase_client:
        return None
    try:
        payload = frontend_to_supabase(product_data)
        if "id" not in payload or not payload["id"]:
            payload["id"] = f"sb_{int(time.time()*1000)}"
        if "created_at" not in payload:
            payload["created_at"] = datetime.now(timezone.utc).isoformat()

        res = supabase_client.table("products").insert(payload).execute()
        if res and res.data and len(res.data) > 0:
            return supabase_to_frontend(res.data[0])
        return supabase_to_frontend(payload)
    except Exception as e:
        print(f"⚠️ Error insertando producto en Supabase: {e}", file=sys.stderr)
        raise e

def update_supabase_product(product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Actualiza un producto existente en public.products."""
    if not supabase_client:
        return None
    try:
        payload = frontend_to_supabase(updates)
        payload.pop("id", None)  # No alterar clave primaria
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()

        res = supabase_client.table("products").update(payload).eq("id", str(product_id)).execute()
        if res and res.data and len(res.data) > 0:
            return supabase_to_frontend(res.data[0])
        return fetch_supabase_product_by_id(product_id)
    except Exception as e:
        print(f"⚠️ Error actualizando producto #{product_id} en Supabase: {e}", file=sys.stderr)
        raise e

def delete_supabase_product(product_id: str) -> bool:
    """Elimina permanentemente un producto de public.products en Supabase."""
    if not supabase_client:
        return False
    try:
        res = supabase_client.table("products").delete().eq("id", str(product_id)).execute()
        return True
    except Exception as e:
        print(f"⚠️ Error eliminando producto #{product_id} en Supabase: {e}", file=sys.stderr)
        raise e

def upload_supabase_product_image(product_id: str, file_bytes: bytes, filename: str, content_type: str) -> str:
    """Sube un archivo de imagen al bucket público 'product-images' y retorna la URL pública."""
    if not supabase_client:
        raise ValueError("Supabase no está configurado")

    ensure_bucket_exists("product-images")

    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    safe_filename = f"prod_{product_id}_{int(time.time()*1000)}_{os.urandom(3).hex()}{ext}"

    supabase_client.storage.from_("product-images").upload(
        path=safe_filename,
        file=file_bytes,
        file_options={"content-type": content_type or f"image/{ext.lstrip('.')}"}
    )

    public_url = supabase_client.storage.from_("product-images").get_public_url(safe_filename)

    # Actualizar la columna image_url del producto en Supabase
    update_supabase_product(product_id, {"image_url": public_url})

    return public_url

def sync_initial_catalog_to_supabase(local_products: List[Dict[str, Any]]) -> int:
    """Importa el catálogo local a Supabase si la tabla public.products está vacía."""
    if not supabase_client or not local_products:
        return 0

    try:
        res = supabase_client.table("products").select("id", count="exact").limit(1).execute()
        count = res.count if res.count is not None else len(res.data or [])
        if count == 0:
            print("[INFO] public.products esta vacia en Supabase. Importando catalogo local...")
            batch_rows = []
            now_iso = datetime.now(timezone.utc).isoformat()
            for p in local_products:
                row = frontend_to_supabase(p)
                if "created_at" not in row:
                    row["created_at"] = now_iso
                batch_rows.append(row)

            # Insertar en lotes de 40 para evitar exceder limites de payload
            inserted_count = 0
            for i in range(0, len(batch_rows), 40):
                batch = batch_rows[i:i+40]
                supabase_client.table("products").upsert(batch, on_conflict="id").execute()
                inserted_count += len(batch)

            print(f"[OK] {inserted_count} productos importados a Supabase exitosamente.")
            return inserted_count
        else:
            print(f"[INFO] Supabase ya contiene {count} productos. Omitiendo importacion inicial.")
            return 0
    except Exception as e:
        print(f"Aviso en sync_initial_catalog_to_supabase: {e}", file=sys.stderr)
        return 0
