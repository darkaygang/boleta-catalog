import os
import sys
import json
import shutil
from build_catalog import generate_dist

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def apply_edits(source_json_path=None):
    """
    Sincroniza y reconstruye el catálogo en dist/ a partir de las ediciones.
    Si se proporciona source_json_path (ej. archivo descargado desde el navegador),
    lo actualiza en data/catalog.json y reconstruye dist/ inmediatamente.
    """
    target_path = os.path.join("data", "catalog.json")

    if source_json_path:
        if not os.path.exists(source_json_path):
            print(f"Error: El archivo especificado no existe: {source_json_path}")
            return False
        print(f"Importando ediciones desde {source_json_path} ...")
        shutil.copy2(source_json_path, target_path)

    if not os.path.exists(target_path):
        print(f"Error: {target_path} no encontrado.")
        return False

    with open(target_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    initial_count = len(products)
    # Filtrar items descartados o inactivos
    active_products = [
        p for p in products 
        if p.get("status") != "descartado" and not p.get("discarded", False)
    ]
    discarded_count = initial_count - len(active_products)

    if discarded_count > 0:
        print(f"Depurando items descartados: {discarded_count} eliminados permanentemente.")
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(active_products, f, indent=2, ensure_ascii=False)

    print(f"Catálogo saneado con {len(active_products)} productos activos.")
    # Reconstruir dist
    generate_dist()
    print("✓ Sincronización completada en menos de 1 segundo.")
    return True

if __name__ == "__main__":
    src_file = sys.argv[1] if len(sys.argv) > 1 else None
    apply_edits(src_file)
