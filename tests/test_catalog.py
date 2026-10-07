import os
import sys
import json
import sqlite3
import unittest
import urllib.request
from server.main import health_check, list_products, app

class TestBoletaCatalog(unittest.TestCase):
    def setUp(self):
        self.dist_dir = "dist"
        self.catalog_json = os.path.join(self.dist_dir, "data", "products.json")
        self.catalog_js = os.path.join(self.dist_dir, "data", "products.js")
        self.index_html = os.path.join(self.dist_dir, "index.html")
        self.style_css = os.path.join(self.dist_dir, "css", "style.css")
        self.app_js = os.path.join(self.dist_dir, "js", "app.js")
        self.logo_img = os.path.join(self.dist_dir, "images", "logo.png")
        self.sqlite_db = os.path.join("data", "boleta.db")

    def test_files_exist(self):
        """Verificar existencia de todos los archivos esenciales en dist."""
        self.assertTrue(os.path.exists(self.index_html), "Falta index.html en dist")
        self.assertTrue(os.path.exists(self.style_css), "Falta style.css en dist")
        self.assertTrue(os.path.exists(self.app_js), "Falta app.js en dist")
        self.assertTrue(os.path.exists(self.catalog_json), "Falta products.json en dist")
        self.assertTrue(os.path.exists(self.catalog_js), "Falta products.js en dist")
        self.assertTrue(os.path.exists(self.logo_img), "Falta images/logo.png en dist")

    def test_catalog_data_integrity(self):
        """Verificar integridad y campos del catálogo saneado de 114 productos."""
        with open(self.catalog_json, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(len(data), 114, f"Esperados 114 productos saneados, encontrados {len(data)}")

        for p in data:
            self.assertIn("id", p)
            self.assertIn("title", p)
            self.assertIn("category", p)
            self.assertIn("price_usd", p)
            self.assertIn("price_bcv", p)
            self.assertIn("numeric_usd", p)
            self.assertIn("numeric_bcv", p)
            self.assertIn("image", p)
            self.assertIn("thumb", p)
            self.assertIn("sizes", p)
            self.assertIn("gallery", p)

            img_path = os.path.join(self.dist_dir, p["image"])
            self.assertTrue(os.path.exists(img_path), f"Imagen no existe: {img_path}")

    def test_no_windows_absolute_paths(self):
        """Verificar que no existan rutas absolutas tipo C:\\ en dist."""
        for root, _, files in os.walk(self.dist_dir):
            for file in files:
                if file.endswith(('.html', '.js', '.css', '.json')):
                    full_p = os.path.join(root, file)
                    with open(full_p, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        self.assertNotIn("C:\\", content, f"Ruta absoluta C:\\ detectada en {full_p}")
                        self.assertNotIn("C:/", content, f"Ruta absoluta C:/ detectada en {full_p}")

    def test_html_components_present(self):
        """Verificar logo oficial, tabs, carrito, modales, B2B hook y addProductModal."""
        with open(self.index_html, "r", encoding="utf-8") as f:
            html = f.read()

        self.assertIn("brand-logo-img", html)
        self.assertIn("images/logo.png", html)
        self.assertIn("categoryTabs", html)
        self.assertIn("productGrid", html)
        self.assertIn("floatingCartBtn", html)
        self.assertIn("cartDrawer", html)
        self.assertIn("productModal", html)
        self.assertIn("productEditModal", html)
        self.assertIn("mergeConfirmModal", html)
        self.assertIn("addProductModal", html, "Falta modal addProductModal")
        self.assertIn("uploadDropZone", html, "Falta uploadDropZone")
        self.assertIn("b2b-link", html)
        self.assertIn("Barquisimeto", html)

    def test_logo_styling_dimensions(self):
        """Verificar que el logo oficial posea las dimensiones especificadas (65px) y glow."""
        with open(self.style_css, "r", encoding="utf-8") as f:
            css = f.read()

        self.assertIn("height: 65px;", css)
        self.assertIn("max-width: 240px;", css)
        self.assertIn("drop-shadow", css)
        self.assertIn("height: 52px;", css)

    def test_sqlite_database_and_records(self):
        """Verificar que la base de datos SQLite exista y contenga 114 productos."""
        self.assertTrue(os.path.exists(self.sqlite_db), f"Falta {self.sqlite_db}")
        conn = sqlite3.connect(self.sqlite_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM products WHERE status != 'descartado'")
        count = cursor.fetchone()[0]
        conn.close()
        self.assertGreaterEqual(count, 114, f"Se esperaban al menos 114 productos en SQLite, encontrados {count}")

    def test_fastapi_endpoints_logic(self):
        """Verificar endpoints y controladores de FastAPI."""
        # 1. Health check
        data = health_check()
        self.assertEqual(data["status"], "ok")
        self.assertIn("active_products_count", data)
        self.assertGreaterEqual(data["active_products_count"], 114)

        # 2. Products List
        prods = list_products(include_discarded=False)
        self.assertIsInstance(prods, list)
        self.assertGreaterEqual(len(prods), 114)

    def test_render_and_deploy_configs(self):
        """Verificar que requirements.txt y render.yaml estén configurados."""
        req_path = "requirements.txt"
        render_path = "render.yaml"
        self.assertTrue(os.path.exists(req_path), "Falta requirements.txt")
        self.assertTrue(os.path.exists(render_path), "Falta render.yaml")

        with open(req_path, "r", encoding="utf-8") as f:
            req_content = f.read()
        self.assertIn("fastapi", req_content)
        self.assertIn("uvicorn", req_content)

        with open(render_path, "r", encoding="utf-8") as f:
            render_content = f.read()
        self.assertIn("server.main:app", render_content)
        self.assertIn("$PORT", render_content)

    def test_whatsapp_integration_and_phones(self):
        """Verificar encodeURIComponent y teléfonos de WhatsApp en app.js."""
        with open(self.app_js, "r", encoding="utf-8") as f:
            js = f.read()

        self.assertIn("encodeURIComponent", js)
        self.assertIn("https://wa.me/", js)
        self.assertIn("584245314215", js, "Falta teléfono B2C 584245314215")
        self.assertIn("573215885381", js, "Falta teléfono B2B 573215885381")

    def test_features_in_js(self):
        """Verificar funciones de Drag-to-Merge, búsqueda multi-token, editor y add product."""
        with open(self.app_js, "r", encoding="utf-8") as f:
            js = f.read()

        self.assertIn("normalizeStr", js, "Falta normalizador de búsqueda")
        self.assertIn("executeCardMerge", js, "Falta función de fusión Drag-to-Merge")
        self.assertIn("triggerMergePrompt", js, "Falta prompt de fusión")
        self.assertIn("toggleEditorMode", js, "Falta toggle de modo editor")
        self.assertIn("exportCleanCatalog", js, "Falta exportación de catálogo")
        self.assertIn("openAddProductModal", js, "Falta openAddProductModal")
        self.assertIn("handleAddProductSubmit", js, "Falta handleAddProductSubmit")

if __name__ == "__main__":
    unittest.main()
