"""Isolated integration tests: no .env, production DB, storage or network access."""
import copy
import io
import os
import secrets
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from PIL import Image
from server.main import create_app
from server.state import StateStore, StateUnavailable, StateConflict


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"ADMIN_PASSWORD": "test-only-strong-passphrase", "BOLETA_ENV": "development"})
        self.env.start()
        self.store = StateStore(self.temp.name, allow_local=True)
        self.client = TestClient(create_app(self.store))
        self.csrf = self.client.post("/api/auth/login", json={"password": "test-only-strong-passphrase"}).json()["csrf_token"]
        self.headers = {"X-CSRF-Token": self.csrf}

    def tearDown(self):
        self.client.close()
        self.env.stop()
        self.temp.cleanup()

    def test_auth_cookie_csrf_and_bypass_rejection(self):
        stranger = TestClient(create_app(self.store))
        self.assertEqual(stranger.post("/api/products", json={"title": "x"}, headers={"X-Editor-Auth": "true"}).status_code, 401)
        self.assertEqual(self.client.post("/api/products", json={"title": "x"}).status_code, 403)
        self.assertEqual(self.client.post("/api/products", json={"title": "x"}, headers={**self.headers, "Origin": "https://evil.invalid"}).status_code, 403)
        cookie = self.client.cookies.get("boleta_admin")
        self.assertIsNotNone(cookie)
        self.assertTrue(self.client.get("/api/auth/session").json()["authenticated"])
        self.client.post("/api/auth/logout", headers=self.headers)
        self.assertFalse(self.client.get("/api/auth/session").json()["authenticated"])

    def test_weak_environment_secret_cannot_login(self):
        with patch.dict(os.environ, {"ADMIN_PASSWORD": "1234"}):
            c = TestClient(create_app(self.store))
            self.assertEqual(c.post("/api/auth/login", json={"password": "1234"}).status_code, 503)

    def test_environment_secret_ten_characters_can_login(self):
        secret = secrets.token_urlsafe(12)[:10]
        with patch.dict(os.environ, {"ADMIN_PASSWORD": secret}):
            c = TestClient(create_app(self.store))
            self.assertEqual(c.post("/api/auth/login", json={"password": secret}).status_code, 200)
            self.assertEqual(c.post("/api/auth/login", json={"password": secret + "wrong"}).status_code, 401)

    def test_chrome_backdrop_and_custom_order_survive_editor_save(self):
        default = self.client.get("/api/site-settings").json()
        self.assertEqual(default["site_sections"]["order"][0], "catalog")
        self.assertEqual(default["hero"]["backdrop"], "/images/hero-chrome-backdrop.webp")
        admin = self.client.get("/api/admin/site-settings").json()
        admin["draft"]["site_sections"]["order"].reverse()
        wanted = admin["draft"]["site_sections"]["order"][:]
        admin["draft"]["hero"]["backdrop"] = "/images/custom-backdrop.webp"
        saved = self.client.put("/api/admin/site-settings", json={"version": admin["version"], "settings": admin["draft"]}, headers=self.headers)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["draft"]["site_sections"]["order"], wanted)
        self.assertEqual(saved.json()["draft"]["hero"]["backdrop"], "/images/custom-backdrop.webp")
        bad = copy.deepcopy(saved.json()["draft"])
        bad["hero"]["backdrop"] = "javascript:alert(1)"
        self.assertEqual(self.client.put("/api/admin/site-settings", json={"version": saved.json()["version"], "settings": bad}, headers=self.headers).status_code, 422)

    def test_product_roundtrip_archive_and_restore(self):
        payload = {"id": "test-new", "title": "Anillo test", "numeric_usd": 21.5, "numeric_bcv": 999, "gallery": ["/photos/a.jpg"], "sizes": ["US 7", "US 8"], "variants": [{"id": "v1", "size": "7", "quantity": 2}], "image": "/photos/main.jpg"}
        response = self.client.post("/api/products", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["numeric_bcv"], 999)
        response = self.client.put("/api/products/test-new", json={"title": "V2"}, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        reopened = StateStore(self.temp.name, allow_local=True).read()
        p = next(p for p in reopened["products"] if p["id"] == "test-new")
        self.assertEqual(p["gallery"], payload["gallery"])
        self.assertEqual(p["sizes"], payload["sizes"])
        self.assertEqual(p["variants"], payload["variants"])
        self.assertEqual(self.client.delete("/api/products/test-new", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get("/api/products/test-new").status_code, 404)
        self.assertEqual(self.client.patch("/api/products/test-new", json={"status": "aprobado"}, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get("/api/products/test-new").status_code, 200)

    def test_merge_retains_every_photo(self):
        for pid in ("merge-a", "merge-b"):
            response = self.client.post("/api/products", json={"id": pid, "title": pid, "image": f"/photos/{pid}.jpg", "gallery": [f"/photos/{pid}-back.jpg"]}, headers=self.headers)
            self.assertEqual(response.status_code, 200, response.text)
        response = self.client.post("/api/products/merge", json={"source_id": "merge-a", "target_id": "merge-b"}, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()["target_product"]["gallery"]), 3)
        self.assertEqual(self.client.get("/api/products/merge-a").status_code, 404)

    def test_draft_publish_conflict_and_restore(self):
        original = self.client.get("/api/site-settings").json()
        current = self.client.get("/api/admin/site-settings").json()
        draft = copy.deepcopy(current["draft"])
        draft["hero"]["title"] = "NUEVO"
        saved = self.client.put("/api/admin/site-settings", json={"version": 0, "settings": draft}, headers=self.headers)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(self.client.get("/api/site-settings").json()["hero"]["title"], original["hero"]["title"])
        self.assertEqual(self.client.put("/api/admin/site-settings", json={"version": 0, "settings": draft}, headers=self.headers).status_code, 409)
        published = self.client.post("/api/admin/site-settings/publish", json={"version": 1}, headers=self.headers)
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(self.client.get("/api/site-settings").json()["hero"]["title"], "NUEVO")
        restored = self.client.post("/api/admin/site-settings/restore", json={"version": 2, "history_version": 1}, headers=self.headers)
        self.assertEqual(restored.status_code, 200, restored.text)
        self.assertEqual(restored.json()["draft"]["hero"]["title"], original["hero"]["title"])
        self.assertEqual(restored.json()["published"]["hero"]["title"], "NUEVO")

    def test_settings_reject_invalid_font_and_url(self):
        draft = self.client.get("/api/site-settings").json()
        for mutate in (lambda d: d["fonts"].update({"heading": "url(evil)"}), lambda d: d["hero"].update({"image": "javascript:alert(1)"})):
            candidate = copy.deepcopy(draft)
            mutate(candidate)
            self.assertEqual(self.client.put("/api/admin/site-settings", json={"version": 0, "settings": candidate}, headers=self.headers).status_code, 422)

    def test_section_order_copy_and_critical_catalog_visibility(self):
        draft = self.client.get("/api/admin/site-settings").json()["draft"]
        draft["site_sections"]["order"].reverse()
        draft["site_sections"]["hidden"] = ["radio", "community"]
        draft["copy"]["radio_title"] = "NUEVA RADIO"
        saved = self.client.put("/api/admin/site-settings", json={"version": 0, "settings": draft}, headers=self.headers)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["draft"]["copy"]["radio_title"], "NUEVA RADIO")
        for hidden in (["catalog"], ["radio", "radio"], ["unknown"]):
            candidate = copy.deepcopy(draft)
            candidate["site_sections"]["hidden"] = hidden
            self.assertEqual(self.client.put("/api/admin/site-settings", json={"version": 1, "settings": candidate}, headers=self.headers).status_code, 422)
        candidate = copy.deepcopy(draft)
        candidate["site_sections"]["order"].pop()
        self.assertEqual(self.client.put("/api/admin/site-settings", json={"version": 1, "settings": candidate}, headers=self.headers).status_code, 422)

    def test_product_status_type_and_unique_variant_ids(self):
        invalid = [
            {"title": "QA", "status": []},
            {"title": "QA", "variants": [{"id": "same", "size": "8"}, {"id": "same", "size": "9"}]},
            {"title": "QA", "variants": [{"size": "8"}]},
        ]
        for payload in invalid:
            response = self.client.post("/api/products", json=payload, headers=self.headers)
            self.assertEqual(response.status_code, 422, response.text)

    def test_leads_consent_and_phone_dedup_private(self):
        data = {"name": "Example", "whatsapp": "+58 424-0000000", "consent": True, "consent_version": "2026-10"}
        self.assertEqual(self.client.post("/api/leads", json={**data, "consent": False}).status_code, 422)
        self.assertEqual(self.client.post("/api/leads", json=data).status_code, 200)
        self.assertEqual(self.client.post("/api/leads", json={**data, "whatsapp": "584240000000"}).status_code, 200)
        leads = self.client.get("/api/admin/leads").json()["leads"]
        self.assertEqual(len(leads), 1)
        self.assertIn("consented_at", leads[0])
        self.assertFalse(leads[0]["marketing_consent"])
        stranger = TestClient(create_app(self.store))
        self.assertEqual(stranger.get("/api/admin/leads").status_code, 401)
        self.assertEqual(self.client.delete('/api/admin/leads/' + leads[0]["id"], headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get("/api/admin/leads").json()["leads"], [])

    def test_malformed_public_json_is_validation_error(self):
        for path in ("/api/leads", "/api/events", "/api/auth/login"):
            self.assertEqual(self.client.post(path, json=[]).status_code, 422)

    def test_events_reject_pii_and_aggregate(self):
        self.assertEqual(self.client.post("/api/events", json={"event": "page_view", "name": "private"}).status_code, 422)
        self.assertEqual(self.client.post("/api/events", json={"event": "whatsapp_click"}).status_code, 200)
        self.assertEqual(self.client.get("/api/admin/stats").json()["events"]["whatsapp_click"], 1)

    def test_retired_rewards_return_gone_and_preserve_historical_state(self):
        def legacy(state):
            state["spins"] = {"historic": {"claim_code": "EXISTING"}}
            state["reward_claims"] = {"physical": 2}
            for mode in ("draft", "published"):
                state["settings"][mode]["rewards"] = {"enabled": True, "terms": "Legacy", "prizes": [{"id": "old", "label": "Old", "quantity": 10}]}
                state["settings"][mode]["site_sections"]["order"].insert(1, "rewards")
        self.store.mutate(legacy)
        before = self.store.read()
        for attempt in range(2):
            response = self.client.post("/api/rewards/spin", json={})
            self.assertEqual(response.status_code, 410, response.text)
            self.assertNotIn("set-cookie", response.headers)
        after = self.store.read()
        self.assertEqual(after["revision"], before["revision"])
        self.assertEqual(after["spins"], before["spins"])
        self.assertEqual(after["reward_claims"], before["reward_claims"])
        public = self.client.get("/api/site-settings").json()
        self.assertNotIn("rewards", public)
        self.assertNotIn("rewards", public["site_sections"]["order"])
        admin = self.client.get("/api/admin/site-settings").json()
        saved = self.client.put("/api/admin/site-settings", json={"version": admin["version"], "settings": admin["draft"]}, headers=self.headers)
        self.assertEqual(saved.status_code, 200, saved.text)
        published = self.client.post("/api/admin/site-settings/publish", json={"version": saved.json()["version"]}, headers=self.headers)
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(self.store.read()["spins"], before["spins"])
        self.assertTrue(self.store.read()["settings"]["draft"]["rewards"]["enabled"])

    def test_studio_logo_editing_and_legacy_defaults(self):
        self.store.mutate(lambda state: state["settings"]["draft"]["studio"].pop("logo"))
        settings = self.client.get("/api/admin/site-settings").json()
        self.assertEqual(settings["draft"]["studio"]["logo"], "/images/digital-solution-logo.webp")
        settings["draft"]["studio"]["logo"] = "/images/agency-custom.webp"
        saved = self.client.put("/api/admin/site-settings", json={"version": settings["version"], "settings": settings["draft"]}, headers=self.headers)
        self.assertEqual(saved.status_code, 200, saved.text)
        bad = copy.deepcopy(saved.json()["draft"])
        bad["studio"]["logo"] = "javascript:alert(1)"
        self.assertEqual(self.client.put("/api/admin/site-settings", json={"version": saved.json()["version"], "settings": bad}, headers=self.headers).status_code, 422)

    def test_upload_reencodes_checks_and_rejects_bad_bytes(self):
        bad = self.client.post("/api/upload", files={"file": ("fake.png", b"not an image", "image/png")}, headers=self.headers)
        self.assertEqual(bad.status_code, 422)
        output = io.BytesIO()
        Image.new("RGB", (20, 20), "purple").save(output, "PNG")
        good = self.client.post("/api/upload", files={"file": ("../../x.png", output.getvalue(), "image/png")}, headers=self.headers)
        self.assertEqual(good.status_code, 200, good.text)
        self.assertRegex(good.json()["url"], r"^/api/media/[a-f0-9]{40}\.webp$")
        self.assertEqual(self.client.get(good.json()["url"]).status_code, 200)

    def test_local_thumbnail_is_small_cached_and_cannot_read_private_files(self):
        root = Path(self.temp.name) / "thumbnail-fixture"
        photos = root / "dist" / "photos"
        photos.mkdir(parents=True)
        source = photos / "large.png"
        Image.effect_noise((1200, 900), 60).convert("RGB").save(source)
        before = source.read_bytes()
        (root / "private.png").write_bytes(before)
        with patch("server.main.BASE", root):
            response = self.client.get("/api/thumbnail", params={"src": "photos/large.png"})
            self.assertEqual(response.status_code, 200, response.text[:100] if response.status_code != 200 else "")
            self.assertEqual(response.headers["content-type"], "image/webp")
            self.assertIn("public", response.headers["cache-control"])
            self.assertIn("etag", response.headers)
            with Image.open(io.BytesIO(response.content)) as image:
                self.assertLessEqual(image.width, 480)
                self.assertLessEqual(image.height, 480)
            self.assertLess(len(response.content), len(before))
            self.assertEqual(source.read_bytes(), before)
            for src in ("https://example.com/image.jpg", "photos/../../private.png", "../private.png", "/private.png", "photos/..\\private.png", "photos/%2e%2e/private.png", "data/boleta.db", "photos/missing.jpg"):
                self.assertIn(self.client.get("/api/thumbnail", params={"src": src}).status_code, (404, 422))
            self.assertEqual(self.client.get("/api/thumbnail", params={"src": "photos/large.png"}).content, response.content)

    def test_remote_failure_never_writes_local(self):
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.execute.side_effect = RuntimeError("offline")
        store = StateStore(self.temp.name, client=client, allow_local=True)
        with self.assertRaises(StateUnavailable):
            store.mutate(lambda state: state.update({"oops": 1}))

    def test_remote_conflict_detected(self):
        client = MagicMock()
        state = self.store.seed()
        client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"document": state}]
        client.rpc.return_value.execute.return_value.data = False
        remote = StateStore(self.temp.name, client=client)
        with self.assertRaises(StateConflict):
            remote.mutate(lambda state: state.update({"test": True}))


if __name__ == "__main__":
    unittest.main()
