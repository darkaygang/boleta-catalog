import os
import sys
import json
import shutil

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def generate_dist():
    print("Iniciando generación completa para ./dist/ ...")

    catalog_path = os.path.join("data", "catalog.json")
    if not os.path.exists(catalog_path):
        print("Error: data/catalog.json no existe. Ejecuta scripts/import_catalog.py primero.")
        return False

    with open(catalog_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    dist_dir = "dist"
    os.makedirs(dist_dir, exist_ok=True)
    dist_photos_dir = os.path.join(dist_dir, "photos")
    os.makedirs(dist_photos_dir, exist_ok=True)
    dist_images_dir = os.path.join(dist_dir, "images")
    os.makedirs(dist_images_dir, exist_ok=True)
    dist_data_dir = os.path.join(dist_dir, "data")
    os.makedirs(dist_data_dir, exist_ok=True)
    dist_css_dir = os.path.join(dist_dir, "css")
    os.makedirs(dist_css_dir, exist_ok=True)
    dist_js_dir = os.path.join(dist_dir, "js")
    os.makedirs(dist_js_dir, exist_ok=True)

    # 1. Copiar logo oficial
    logo_src = "logo qes.png"
    if not os.path.exists(logo_src):
        logo_src = os.path.join("bdv-branding-reference-pack", "assets", "bdv-logo-original.png")
    if not os.path.exists(logo_src):
        logo_src = os.path.join("ChatExport_2026-10-06", "logo.png")
    logo_dst = os.path.join(dist_images_dir, "logo.png")
    if os.path.exists(logo_src):
        if not os.path.exists(logo_dst) or os.path.getsize(logo_src) != os.path.getsize(logo_dst):
            shutil.copy2(logo_src, logo_dst)
        print("Logo oficial copiado a dist/images/logo.png")

    # 2. Copiar fotos (principales y de galería)
    copied = 0
    for p in products:
        all_imgs = [p["image"]] + p.get("gallery", [])
        for img_rel in all_imgs:
            img_src = os.path.join("ChatExport_2026-10-06", img_rel)
            img_dst = os.path.join(dist_dir, img_rel)
            os.makedirs(os.path.dirname(img_dst), exist_ok=True)
            if os.path.exists(img_src):
                if not os.path.exists(img_dst) or os.path.getsize(img_src) != os.path.getsize(img_dst):
                    shutil.copy2(img_src, img_dst)
                copied += 1

        thumb_src = os.path.join("ChatExport_2026-10-06", p["thumb"])
        thumb_dst = os.path.join(dist_dir, p["thumb"])
        if os.path.exists(thumb_src):
            if not os.path.exists(thumb_dst) or os.path.getsize(thumb_src) != os.path.getsize(thumb_dst):
                shutil.copy2(thumb_src, thumb_dst)

    print(f"Fotos copiadas a ./dist/photos/: {copied}")

    # 3. Guardar JSON
    json_path = os.path.join(dist_data_dir, "products.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    # 4. Guardar versión JS exportable (para compatibilidad total file:// y http://)
    js_data_path = os.path.join(dist_data_dir, "products.js")
    with open(js_data_path, "w", encoding="utf-8") as f:
        f.write("window.BOLETA_CATALOG = " + json.dumps(products, indent=2, ensure_ascii=False) + ";\n")

    print("Catálogo exportado a dist/data/products.json y dist/data/products.js")
    return True

if __name__ == "__main__":
    generate_dist()
