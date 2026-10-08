"""
BOLETA CLOTHING — Pruebas de Persistencia Supabase
==================================================
Valida endpoints CRUD, subida de imágenes a bucket 'product-images',
autenticación PIN 2026, conversión de esquema y fallback local offline.
"""
import os
import json
import io
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from server.main import app, verify_editor_auth
import server.supabase_client as sbc

class TestSupabaseIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.auth_headers = {
            "X-Admin-PIN": "2026",
            "X-Editor-Auth": "true",
            "Authorization": "Bearer 2026"
        }

    def test_requirements_contains_supabase(self):
        """Verificar que supabase esté listado como dependencia en requirements.txt."""
        req_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "requirements.txt")
        self.assertTrue(os.path.exists(req_path), "requirements.txt no existe")
        with open(req_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("supabase", content.lower(), "supabase no está en requirements.txt")

    def test_supabase_schema_mapping_bidirectional(self):
        """Verificar conversión bidireccional entre columnas public.products y vitrina."""
        # Supabase -> Frontend
        sb_row = {
            "id": "item_999",
            "name": "Anillo Gótico Plata 925",
            "description": "Plata maciza ley 925 pulida",
            "price": 45.0,
            "category": "Joyería",
            "image_url": "https://xyz.supabase.co/storage/v1/object/public/product-images/prod_999.jpg",
            "available": True,
            "created_at": "2026-10-07T12:00:00Z",
            "updated_at": "2026-10-07T12:00:00Z"
        }
        fe = sbc.supabase_to_frontend(sb_row)
        self.assertEqual(fe["id"], "item_999")
        self.assertEqual(fe["title"], "Anillo Gótico Plata 925")
        self.assertEqual(fe["name"], "Anillo Gótico Plata 925")
        self.assertEqual(fe["numeric_usd"], 45.0)
        self.assertEqual(fe["price_usd"], "$45 USD")
        self.assertEqual(fe["category"], "Joyería")
        self.assertEqual(fe["image"], sb_row["image_url"])
        self.assertEqual(fe["image_url"], sb_row["image_url"])
        self.assertTrue(fe["in_stock"])
        self.assertTrue(fe["available"])
        self.assertEqual(fe["material"], "Plata maciza ley 925 pulida")

        # Frontend -> Supabase
        sb_payload = sbc.frontend_to_supabase(fe)
        expected_cols = {"id", "name", "description", "price", "category", "image_url", "available", "created_at", "updated_at"}
        self.assertTrue(set(sb_payload.keys()).issubset(expected_cols))
        self.assertEqual(sb_payload["name"], "Anillo Gótico Plata 925")
        self.assertEqual(sb_payload["price"], 45.0)
        self.assertEqual(sb_payload["image_url"], sb_row["image_url"])
        self.assertTrue(sb_payload["available"])

    def test_get_products_endpoint(self):
        """GET /api/products debe devolver lista de productos con status 200."""
        res = self.client.get("/api/products")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 114)
        sample = data[0]
        self.assertIn("id", sample)
        self.assertTrue("title" in sample or "name" in sample)
        self.assertTrue("price" in sample or "numeric_usd" in sample)

    def test_write_endpoints_require_editor_auth(self):
        """Operaciones de escritura deben exigir PIN 2026 del Modo Editor."""
        # POST sin auth
        res_post = self.client.post("/api/products", json={"name": "Test Item", "price": 10})
        self.assertEqual(res_post.status_code, 401)

        # PUT sin auth
        res_put = self.client.put("/api/products/test_1", json={"price": 20})
        self.assertEqual(res_put.status_code, 401)

        # DELETE sin auth
        res_del = self.client.delete("/api/products/test_1")
        self.assertEqual(res_del.status_code, 401)

        # POST image sin auth
        dummy_img = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 20)
        res_img = self.client.post(
            "/api/products/test_1/image",
            files={"file": ("test.jpg", dummy_img, "image/jpeg")}
        )
        self.assertEqual(res_img.status_code, 401)

    def test_crud_product_flow(self):
        """Prueba completa de Crear, Editar, Subir Imagen y Eliminar producto."""
        test_id = f"test_sb_{os.urandom(3).hex()}"
        payload = {
            "id": test_id,
            "name": "Lentes Cybergoth Alien Edition",
            "title": "Lentes Cybergoth Alien Edition",
            "price": 35.0,
            "category": "Lentes",
            "description": "Acetato negro brillo con filtro UV400",
            "image_url": "images/logo.png",
            "available": True
        }

        # 1. CREATE (POST)
        res_create = self.client.post("/api/products", json=payload, headers=self.auth_headers)
        self.assertEqual(res_create.status_code, 200)
        created = res_create.json()
        self.assertEqual(created["id"], test_id)
        self.assertEqual(created["name"], payload["name"])

        # 2. UPDATE (PUT)
        update_payload = {
            "name": "Lentes Cybergoth Alien Edition (V2)",
            "price": 40.0,
            "description": "Nueva versión con puente de titanio"
        }
        res_update = self.client.put(f"/api/products/{test_id}", json=update_payload, headers=self.auth_headers)
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.json()
        self.assertEqual(updated["name"], "Lentes Cybergoth Alien Edition (V2)")
        self.assertEqual(float(updated["price"]), 40.0)

        # 3. UPLOAD IMAGE (POST /api/products/{id}/image)
        dummy_img = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 30)
        res_img = self.client.post(
            f"/api/products/{test_id}/image",
            files={"file": ("photo.png", dummy_img, "image/png")},
            headers=self.auth_headers
        )
        self.assertEqual(res_img.status_code, 200)
        img_data = res_img.json()
        self.assertTrue(img_data["success"])
        self.assertIn("image_url", img_data)

        # 4. DELETE
        res_del = self.client.delete(f"/api/products/{test_id}", headers=self.auth_headers)
        self.assertEqual(res_del.status_code, 200)
        del_data = res_del.json()
        self.assertTrue(del_data["success"])

    def test_image_upload_validation_and_security(self):
        """Valida que solo se acepten imágenes y se rechacen scripts o ejecutables."""
        test_id = "sec_test_item"
        bad_file = io.BytesIO(b"malicious script content")
        res = self.client.post(
            f"/api/products/{test_id}/image",
            files={"file": ("exploit.exe", bad_file, "application/octet-stream")},
            headers=self.auth_headers
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Solo se aceptan imágenes", res.json()["detail"])

    def test_health_check_endpoint(self):
        """GET /api/health debe responder 200 con status de base de datos y supabase."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("active_products_count", data)
        self.assertIn("supabase_configured", data)
        self.assertGreaterEqual(data["active_products_count"], 114)

    def test_offline_fallback_preserves_data(self):
        """Si Supabase está desconectado o lanza error, el catálogo local responde intacto."""
        # Simular que fetch_supabase_products retorna None (error de red)
        with patch.object(sbc, "is_supabase_configured", return_value=True):
            with patch.object(sbc, "fetch_supabase_products", return_value=None):
                res = self.client.get("/api/products")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertGreaterEqual(len(data), 114)

    def test_initial_sync_avoids_duplicates(self):
        """Si Supabase ya tiene productos, sync_initial_catalog_to_supabase no duplica."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_res = MagicMock()
        mock_res.count = 117
        mock_res.data = [{"id": "1"}]
        mock_select.limit.return_value.execute.return_value = mock_res
        mock_table.select.return_value = mock_select
        mock_client.table.return_value = mock_table

        with patch.object(sbc, "supabase_client", mock_client):
            local_prods = [{"id": "1", "name": "Item 1"}]
            synced = sbc.sync_initial_catalog_to_supabase(local_prods)
            self.assertEqual(synced, 0, "No debe importar si ya existen productos en Supabase")

if __name__ == "__main__":
    unittest.main()
