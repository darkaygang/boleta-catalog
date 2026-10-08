"""
BOLETA CLOTHING — Capa de datos SQLite
=======================================
- Inicializa data/boleta.db y migra data/catalog.json si la tabla está vacía
- CRUD completo de productos, galerías JSON, estados (aprobado/descartado)
- Conversión de filas SQLite a diccionarios compatibles con el frontend
"""
import os
import sqlite3
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "boleta.db")
CATALOG_JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "catalog.json")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa la base de datos SQLite y migra data/catalog.json si está vacía."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT,
        title TEXT NOT NULL,
        category TEXT,
        brand TEXT,
        price_usd TEXT,
        price_bcv TEXT,
        numeric_usd REAL,
        numeric_bcv REAL,
        image TEXT,
        thumb TEXT,
        gallery TEXT,
        sizes TEXT,
        material TEXT,
        tag TEXT,
        is_purchased INTEGER DEFAULT 0,
        in_stock INTEGER DEFAULT 1,
        status TEXT DEFAULT 'aprobado',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()

    # Verificar si ya tiene productos
    cursor.execute("SELECT COUNT(*) FROM products")
    count = cursor.fetchone()[0]

    if count == 0 and os.path.exists(CATALOG_JSON_PATH):
        print(f"Migrando catálogo inicial desde {CATALOG_JSON_PATH} a SQLite...")
        with open(CATALOG_JSON_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        for p in catalog:
            cursor.execute("""
            INSERT OR REPLACE INTO products (
                id, code, title, category, brand, price_usd, price_bcv,
                numeric_usd, numeric_bcv, image, thumb, gallery, sizes,
                material, tag, is_purchased, in_stock, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(p.get("id")),
                p.get("code", f"#BOL-{p.get('id')}"),
                p.get("title", ""),
                p.get("category", "Accesorios"),
                p.get("brand", "BOLETA"),
                p.get("price_usd", f"${p.get('numeric_usd', 0)} USD"),
                p.get("price_bcv", f"{p.get('numeric_bcv', 0)}$ BCV"),
                float(p.get("numeric_usd", 0) or 0),
                float(p.get("numeric_bcv", 0) or 0),
                p.get("image", ""),
                p.get("thumb", p.get("image", "")),
                json.dumps(p.get("gallery", []), ensure_ascii=False),
                json.dumps(p.get("sizes", []), ensure_ascii=False),
                p.get("material", ""),
                p.get("tag", "Por encargo"),
                1 if p.get("is_purchased") else 0,
                1 if p.get("in_stock", True) else 0,
                p.get("status", "aprobado")
            ))
        conn.commit()
        print(f"Migración completada con éxito: {len(catalog)} productos insertados en SQLite.")

    conn.close()

def row_to_dict(row):
    """Convierte un registro de SQLite a diccionario compatible con el frontend y Supabase."""
    if row is None:
        return None
    d = dict(row)
    # Parsear campos JSON
    try:
        d["gallery"] = json.loads(d["gallery"]) if d.get("gallery") else []
    except Exception:
        d["gallery"] = []

    try:
        d["sizes"] = json.loads(d["sizes"]) if d.get("sizes") else []
    except Exception:
        d["sizes"] = []

    d["is_purchased"] = bool(d.get("is_purchased", 0))
    d["in_stock"] = bool(d.get("in_stock", 1))

    # Aliases de compatibilidad directa con Supabase (name, price, description, image_url, available)
    d["name"] = d.get("title") or ""
    d["price"] = float(d.get("numeric_usd") or 0.0)
    d["description"] = d.get("material") or ""
    d["image_url"] = d.get("image") or ""
    d["available"] = d.get("in_stock", True)
    return d

def get_all_products(include_discarded=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    if include_discarded:
        cursor.execute("SELECT * FROM products ORDER BY id ASC")
    else:
        cursor.execute("SELECT * FROM products WHERE status != 'descartado' ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]

def get_product_by_id(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (str(product_id),))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)

def create_product(product_data):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Si no tiene id, generamos uno correlativo o único
    p_id = str(product_data.get("id")) if product_data.get("id") else None
    if not p_id:
        cursor.execute("SELECT MAX(CAST(id AS INTEGER)) FROM products")
        max_row = cursor.fetchone()[0]
        p_id = str((max_row or 1000) + 1)

    # Mapeo de campos Supabase
    title = product_data.get("title") or product_data.get("name") or "Nuevo Producto"
    category = product_data.get("category", "Accesorios")
    brand = product_data.get("brand", "BOLETA")
    try:
        numeric_usd = float(product_data.get("numeric_usd") if product_data.get("numeric_usd") is not None else (product_data.get("price") or 0))
    except (ValueError, TypeError):
        numeric_usd = 0.0

    numeric_bcv = float(product_data.get("numeric_bcv", 0) or round(numeric_usd * 1.15))
    price_usd = product_data.get("price_usd") or f"${int(numeric_usd)} USD"
    price_bcv = product_data.get("price_bcv") or f"{int(numeric_bcv)}$ BCV"
    image = product_data.get("image") or product_data.get("image_url") or ""
    thumb = product_data.get("thumb") or image
    gallery = json.dumps(product_data.get("gallery", []), ensure_ascii=False)
    sizes = json.dumps(product_data.get("sizes", []), ensure_ascii=False)
    material = product_data.get("material") or product_data.get("description") or ""
    tag = product_data.get("tag", "Por encargo")
    is_purchased = 1 if product_data.get("is_purchased") else 0
    in_stock_val = product_data.get("in_stock") if product_data.get("in_stock") is not None else product_data.get("available", True)
    in_stock = 1 if in_stock_val else 0
    status = product_data.get("status", "aprobado")
    code = product_data.get("code") or f"#BOL-{p_id}"

    cursor.execute("""
    INSERT INTO products (
        id, code, title, category, brand, price_usd, price_bcv,
        numeric_usd, numeric_bcv, image, thumb, gallery, sizes,
        material, tag, is_purchased, in_stock, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        p_id, code, title, category, brand, price_usd, price_bcv,
        numeric_usd, numeric_bcv, image, thumb, gallery, sizes,
        material, tag, is_purchased, in_stock, status
    ))
    conn.commit()
    conn.close()
    return get_product_by_id(p_id)

def update_product(product_id, updates):
    conn = get_db_connection()
    cursor = conn.cursor()

    existing = get_product_by_id(product_id)
    if not existing:
        conn.close()
        return None

    # Mapear nombres de columnas de Supabase
    if "name" in updates and "title" not in updates:
        updates["title"] = updates["name"]
    if "price" in updates and "numeric_usd" not in updates:
        updates["numeric_usd"] = float(updates["price"])
        updates["price_usd"] = f"${int(float(updates['price']))} USD"
        updates["numeric_bcv"] = round(float(updates["price"]) * 1.15)
        updates["price_bcv"] = f"{int(round(float(updates['price']) * 1.15))}$ BCV"
    if "description" in updates and "material" not in updates:
        updates["material"] = updates["description"]
    if "image_url" in updates and "image" not in updates:
        updates["image"] = updates["image_url"]
        updates["thumb"] = updates["image_url"]
    if "available" in updates and "in_stock" not in updates:
        updates["in_stock"] = bool(updates["available"])

    # Campos actualizables
    fields = []
    values = []

    simple_fields = [
        "title", "category", "brand", "price_usd", "price_bcv",
        "numeric_usd", "numeric_bcv", "image", "thumb", "material",
        "tag", "status", "code"
    ]

    for f in simple_fields:
        if f in updates:
            fields.append(f"{f} = ?")
            values.append(updates[f])

    if "is_purchased" in updates:
        fields.append("is_purchased = ?")
        values.append(1 if updates["is_purchased"] else 0)

    if "in_stock" in updates:
        fields.append("in_stock = ?")
        values.append(1 if updates["in_stock"] else 0)

    if "gallery" in updates:
        fields.append("gallery = ?")
        val = updates["gallery"]
        values.append(json.dumps(val, ensure_ascii=False) if isinstance(val, list) else str(val))

    if "sizes" in updates:
        fields.append("sizes = ?")
        val = updates["sizes"]
        values.append(json.dumps(val, ensure_ascii=False) if isinstance(val, list) else str(val))

    if not fields:
        conn.close()
        return existing

    values.append(str(product_id))
    sql = f"UPDATE products SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(sql, tuple(values))
    conn.commit()
    conn.close()
    return get_product_by_id(product_id)

def mark_as_purchased(product_id, is_purchased=True):
    return update_product(product_id, {"is_purchased": is_purchased})

def discard_product(product_id):
    return update_product(product_id, {"status": "descartado"})
