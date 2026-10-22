"""Static snapshot and public boundary checks; no production DB or network."""
import json
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from fastapi.testclient import TestClient
from server.main import create_app
from server.state import StateStore

BASE = Path(__file__).resolve().parents[1]

class CatalogSnapshotTests(unittest.TestCase):
    def test_snapshot_images_and_ids(self):
        products = json.loads((BASE / "dist/data/products.json").read_text(encoding="utf-8"))
        self.assertTrue(products)
        ids = [str(p["id"]) for p in products]
        self.assertEqual(len(ids), len(set(ids)))
        public = (BASE / "dist").resolve()
        for product in products:
            for image in [product.get("image"), *product.get("gallery", [])]:
                if not image or urlsplit(image).scheme:
                    continue
                path = (public / image.lstrip("/")).resolve()
                self.assertTrue(path.is_relative_to(public))
                self.assertTrue(path.is_file(), str(path))

    def test_private_paths_are_not_served(self):
        with tempfile.TemporaryDirectory() as temp:
            with TestClient(create_app(StateStore(temp, allow_local=True))) as client:
                for path in ("/.env", "/data/boleta.db", "/server/main.py", "/ChatExport_2026-10-06/messages.html"):
                    self.assertEqual(client.get(path).status_code, 404, path)
                self.assertEqual(client.get("/").status_code, 200)

    def test_snapshot_remains_available_when_remote_unavailable(self):
        with TestClient(create_app(StateStore(allow_local=False))) as client:
            response = client.get("/api/products")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json())
            self.assertEqual(response.headers.get("x-boleta-data-status"), "snapshot")

if __name__ == "__main__":
    unittest.main()
