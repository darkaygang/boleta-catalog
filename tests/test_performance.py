"""Local-only checks for compressed delivery and content-addressed thumbnails."""
import copy
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import zipfile

from fastapi.testclient import TestClient
from fastapi import HTTPException
from PIL import Image

from scripts.build_thumbnails import build_bundle
from server.main import create_app, thumbnail_bytes, thumbnail_bundle, source_digest, validate_settings
from server.settings import DEFAULT_SETTINGS
from server.state import StateStore


class PerformanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.photos = self.root / "dist/photos"
        self.photos.mkdir(parents=True)
        self.source = self.photos / "cover.png"
        Image.effect_noise((900, 700), 60).convert("RGB").save(self.source)
        self.original = self.source.read_bytes()
        (self.root / "dist/data").mkdir()
        (self.root / "dist/data/products.json").write_text(json.dumps([
            {"id": "one", "image": "photos/cover.png"},
            {"id": "private", "image": "photos/../../private.png"},
            {"id": "remote", "image": "https://example.com/image.jpg"},
        ]), encoding="utf-8")
        self.bundle = self.root / "server/assets/catalog-thumbnails.zip"
        self.store = StateStore(self.root / "state", allow_local=True)
        self.client = TestClient(create_app(self.store))
        self.base = patch("server.main.BASE", self.root)
        self.base.start()
        thumbnail_bundle.cache_clear()
        source_digest.cache_clear()
        thumbnail_bytes.cache_clear()

    def tearDown(self):
        self.base.stop()
        self.client.close()
        thumbnail_bundle.cache_clear()
        source_digest.cache_clear()
        thumbnail_bytes.cache_clear()
        self.temp.cleanup()

    def test_bundle_is_reproducible_and_only_includes_public_covers(self):
        count, size = build_bundle(root=self.root)
        first = self.bundle.read_bytes()
        self.assertEqual(count, 1)
        self.assertGreater(size, 0)
        build_bundle(root=self.root)
        self.assertEqual(self.bundle.read_bytes(), first)
        self.assertEqual(self.source.read_bytes(), self.original)
        with zipfile.ZipFile(self.bundle) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            self.assertEqual(len(manifest["thumbnails"]), 1)
            self.assertEqual(len(archive.namelist()), 2)
            self.assertTrue(all(i.date_time == (1980, 1, 1, 0, 0, 0) for i in archive.infolist()))

    def test_matching_thumbnail_needs_no_runtime_image_encoding(self):
        build_bundle(root=self.root)
        with patch("server.main.thumbnail_bytes", side_effect=AssertionError("Must use precomputed image")):
            response = self.client.get("/api/thumbnail", params={"src": "photos/cover.png"})
        self.assertEqual(response.status_code, 200)
        with Image.open(io.BytesIO(response.content)) as image:
            self.assertLessEqual(max(image.size), 400)
        self.assertIn("public", response.headers["cache-control"])
        self.assertEqual(self.source.read_bytes(), self.original)

    def test_changed_source_invalidates_bundle_and_uses_runtime_fallback(self):
        build_bundle(root=self.root)
        Image.new("RGB", (900, 700), "purple").save(self.source)
        with patch("server.main.thumbnail_bytes", wraps=thumbnail_bytes) as fallback:
            response = self.client.get("/api/thumbnail", params={"src": "photos/cover.png"})
        self.assertEqual(response.status_code, 200)
        fallback.assert_called_once()
        with Image.open(io.BytesIO(response.content)) as image:
            self.assertEqual(max(image.size), 480)
        self.assertNotEqual(self.source.read_bytes(), self.original)

    def test_new_source_and_invalid_archive_fall_back_without_private_access(self):
        build_bundle(root=self.root)
        Image.new("RGB", (600, 600), "black").save(self.photos / "new.png")
        self.assertEqual(self.client.get("/api/thumbnail", params={"src": "photos/new.png"}).status_code, 200)
        self.bundle.write_bytes(b"broken archive")
        self.assertEqual(self.client.get("/api/thumbnail", params={"src": "photos/cover.png"}).status_code, 200)
        for source in ("photos/../../private.png", "server/assets/catalog-thumbnails.zip", "https://example.com/image.jpg"):
            self.assertEqual(self.client.get("/api/thumbnail", params={"src": source}).status_code, 404)

    def test_gzip_static_javascript_preserves_content_and_private_no_store(self):
        # The application serves the actual public JS from its static mount; no
        # real remote store, local production DB or .env is read by this test.
        response = self.client.get("/js/app.js", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-encoding"), "gzip")
        self.assertIn("Accept-Encoding", response.headers.get("vary", ""))
        self.assertIn(b"BOLETA", response.content)  # TestClient decodes gzip.
        with patch.dict(os.environ, {"ADMIN_PASSWORD": "local-performance-tests-only", "BOLETA_ENV": "development"}):
            self.assertEqual(self.client.post("/api/auth/login", json={"password": "local-performance-tests-only"}).status_code, 200)
            private = self.client.get("/api/admin/site-settings", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(private.status_code, 200)
        self.assertEqual(private.headers["cache-control"], "no-store")

    def test_poster_url_requires_same_validation_as_hero_images(self):
        # The field is part of DEFAULT_SETTINGS in the parent agent's work.
        settings = copy.deepcopy(DEFAULT_SETTINGS)
        self.assertIn("poster", settings["hero"])
        settings["hero"]["poster"] = "javascript:alert(1)"
        with self.assertRaises(HTTPException) as failure:
            validate_settings(settings)
        self.assertEqual(failure.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
