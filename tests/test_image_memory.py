"""Local-only regression checks for bounded image processing on 512 MiB hosts."""
import hashlib
import io
import os
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from PIL import Image

import server.main as main
from server.state import StateStore


class ImageMemoryTests(unittest.TestCase):
    def setUp(self):
        main.thumbnail_bytes.cache_clear()
        main.source_digest.cache_clear()

    def tearDown(self):
        main.thumbnail_bytes.cache_clear()
        main.source_digest.cache_clear()

    def test_concurrent_thumbnail_and_upload_share_one_decode_slot(self):
        active = peak = 0
        guard = threading.Lock()
        def fake_encode(*args):
            nonlocal active, peak
            with guard:
                active += 1
                peak = max(peak, active)
            time.sleep(0.015)
            with guard:
                active -= 1
            return b"encoded webp"
        with patch.object(main, "encode_image", side_effect=fake_encode), ThreadPoolExecutor(max_workers=16) as pool:
            futures = [pool.submit(main.thumbnail_bytes, f"cold-{n}.png", 1, 1) for n in range(8)]
            futures += [pool.submit(main.encode_upload, io.BytesIO(b"uploaded image")) for _ in range(8)]
            self.assertTrue(all(f.result() == b"encoded webp" for f in futures))
        self.assertEqual(peak, 1, "Upload and thumbnail decoders must share the same memory budget")

    def test_same_cold_thumbnail_is_encoded_once_under_concurrency(self):
        def fake_encode(*args):
            time.sleep(0.02)
            return b"one encoded image"
        with patch.object(main, "encode_image", side_effect=fake_encode) as encode, ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(lambda _: main.thumbnail_bytes("same.png", 123, 456), range(24)))
        self.assertEqual(encode.call_count, 1)
        self.assertTrue(all(r == results[0] for r in results))

    def test_thumbnail_cache_evicts_by_bytes_as_well_as_count(self):
        with patch.object(main, "THUMBNAIL_CACHE_MAX_BYTES", 10), patch.object(main, "encode_image", return_value=b"123456"):
            main.thumbnail_bytes("one.png", 1, 1)
            main.thumbnail_bytes("two.png", 1, 1)
            self.assertEqual(main._thumbnail_cache_bytes, 6)
            self.assertEqual(len(main._thumbnail_cache), 1)
            self.assertIsNone(main.cached_thumbnail(("one.png", 1, 1)))
        with patch.object(main, "encode_image", return_value=b"x"):
            for n in range(70):
                main.thumbnail_bytes(str(n), 1, 1)
        self.assertLessEqual(len(main._thumbnail_cache), 64)
        self.assertLessEqual(main._thumbnail_cache_bytes, main.THUMBNAIL_CACHE_MAX_BYTES)

    def test_jpeg_decoder_subsamples_before_transpose_and_preserves_orientation(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "large.jpg"
            exif = Image.Exif()
            exif[274] = 6
            with Image.new("RGB", (4000, 3000), "purple") as image:
                image.save(source, exif=exif)
            transpose = main.ImageOps.exif_transpose
            sizes = []
            def spy(image):
                sizes.append(image.size)
                return transpose(image)
            with patch.object(main.ImageOps, "exif_transpose", side_effect=spy):
                data = main.thumbnail_bytes(str(source), source.stat().st_mtime_ns, source.stat().st_size)
            self.assertLessEqual(max(sizes[0]), 480, "EXIF must never copy the full original")
            with Image.open(io.BytesIO(data)) as output:
                self.assertGreater(output.height, output.width)
                self.assertEqual(max(output.size), 480)
            with source.open("rb") as upload:
                encoded = main.encode_upload(upload)
            with Image.open(io.BytesIO(encoded)) as output:
                self.assertGreater(output.height, output.width)
                self.assertLessEqual(max(output.size), 2000)

    def test_hash_streams_without_reading_entire_original(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "original.jpg"
            source.write_bytes(b"public image" * 100000)
            expected = hashlib.sha256(source.read_bytes()).hexdigest()
            with patch.object(Path, "read_bytes", side_effect=AssertionError("No unbounded file buffer")):
                self.assertEqual(main.source_digest(str(source), 1, source.stat().st_size), expected)

    def test_failed_decode_releases_gate_and_invalid_upload_stays_rejected(self):
        with patch.object(main, "encode_image", side_effect=ValueError):
            with self.assertRaises(main.HTTPException) as failure:
                main.thumbnail_bytes("bad.png", 1, 1)
            self.assertEqual(failure.exception.status_code, 404)
            with self.assertRaises(main.HTTPException) as failure:
                main.encode_upload(io.BytesIO(b"bad image"))
            self.assertEqual(failure.exception.status_code, 422)
        self.assertTrue(main.IMAGE_DECODE_LOCK.acquire(blocking=False))
        main.IMAGE_DECODE_LOCK.release()


class SoldOutTests(unittest.TestCase):
    def test_sold_out_is_public_persistent_and_independent_of_archive(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"ADMIN_PASSWORD": "local-tests-only-password", "BOLETA_ENV": "development"}):
            store = StateStore(folder, allow_local=True)
            with TestClient(main.create_app(store)) as client:
                auth = client.post("/api/auth/login", json={"password": "local-tests-only-password"}).json()
                headers = {"X-CSRF-Token": auth["csrf_token"]}
                created = client.post("/api/products", json={"id": "sold-test", "title": "Test", "sold_out": True}, headers=headers)
                self.assertEqual(created.status_code, 200, created.text)
                public = client.get("/api/products/sold-test").json()
                self.assertIs(public["sold_out"], True)
                self.assertEqual(public["status"], "aprobado")
                self.assertTrue(any(p["id"] == "sold-test" and p["sold_out"] for p in client.get("/api/products").json()))
                self.assertIs(client.patch("/api/products/sold-test", json={"title": "Renamed"}, headers=headers).json()["sold_out"], True)
                for bad in ("false", 0, None, []):
                    self.assertEqual(client.patch("/api/products/sold-test", json={"sold_out": bad}, headers=headers).status_code, 422)
                saved = StateStore(folder, allow_local=True).read()
                self.assertTrue(next(p for p in saved["products"] if p["id"] == "sold-test")["sold_out"])
                form = client.patch("/api/products/sold-test", data={"sold_out": "false"}, headers=headers)
                self.assertEqual(form.status_code, 200, form.text)
                self.assertIs(form.json()["sold_out"], False)
                self.assertEqual(client.patch("/api/products/sold-test", data={"sold_out": "no"}, headers=headers).status_code, 422)
                self.assertTrue(all(isinstance(p["sold_out"], bool) for p in client.get("/api/products").json()))

    def test_legacy_defaults_do_not_overwrite_existing_sold_out(self):
        with tempfile.TemporaryDirectory() as folder:
            store = StateStore(folder, allow_local=True)
            state = store.seed()
            state["products"] = [{"id": "old"}, {"id": "already-sold", "sold_out": True}]
            complete = store.complete(state)
            self.assertIs(complete["products"][0]["sold_out"], False)
            self.assertIs(complete["products"][1]["sold_out"], True)

    def test_legacy_remote_adoption_keeps_sold_out_without_remote_writes(self):
        remote = MagicMock()
        remote.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"document": {"revision": 0}}]
        remote.table.return_value.select.return_value.execute.return_value.data = [
            {"id": "legacy-sold", "name": "Sold", "price": 10, "available": True, "sold_out": True},
            {"id": "legacy-new", "name": "New", "price": 20, "available": True},
        ]
        state = StateStore(client=remote).read()
        self.assertIs(state["products"][0]["sold_out"], True)
        self.assertIs(state["products"][1]["sold_out"], False)
        remote.rpc.assert_not_called()
        remote.table.return_value.update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
