"""Read-only legacy adoption checks. Runtime remote calls are mocked."""
import copy
import unittest
from unittest.mock import MagicMock
from server.state import StateStore, StateConflict, StateUnavailable

class SupabaseStateTests(unittest.TestCase):
    def test_first_adoption_uses_live_price_and_preserves_gallery(self):
        remote = MagicMock()
        document = {"revision": 0}
        remote.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"document": document}]
        remote.table.return_value.select.return_value.execute.return_value.data = [
            {"id": "one", "name": "Precio vivo", "price": 33.5, "image_url": "https://example.com/image.jpg", "available": True}
        ]
        store = StateStore(client=remote)
        seed = store.seed()
        seed["products"] = [{"id": "one", "gallery": ["/photos/detail.jpg"], "sizes": ["9"], "numeric_usd": 20}]
        store.seed = lambda: copy.deepcopy(seed)
        data = store.read()
        product = data["products"][0]
        self.assertEqual(product["numeric_usd"], 33.5)
        self.assertEqual(product["title"], "Precio vivo")
        self.assertEqual(product["gallery"], ["/photos/detail.jpg"])
        self.assertEqual(product["sizes"], ["9"])
        remote.rpc.assert_not_called()

    def test_legacy_images_jsonb_merges_without_cover_or_description_loss(self):
        remote = MagicMock()
        remote.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"document": {"revision": 0}}]
        cover = "https://example.com/current-cover.webp"
        extra = "https://example.com/upload-extra.webp"
        remote.table.return_value.select.return_value.execute.return_value.data = [{"id": "one", "name": "Actual", "description": "Descripción vigente", "price": 30, "image_url": cover, "gallery": ["/photos/new.jpg", extra], "images": [cover, extra, "/photos/seed.jpg", None, {"invalid": 1}], "available": True}]
        store = StateStore(client=remote)
        seed = store.seed()
        seed["products"] = [{"id": "one", "image": "/photos/old-cover.jpg", "gallery": ["/photos/seed.jpg"], "material": "Material obsoleto", "description": "Descripción obsoleta"}]
        store.seed = lambda: copy.deepcopy(seed)
        product = store.read()["products"][0]
        self.assertEqual(product["image"], cover)
        self.assertEqual(product["thumb"], cover)
        self.assertEqual(product["gallery"], ["/photos/seed.jpg", "/photos/new.jpg", extra])
        self.assertEqual(product["material"], "Descripción vigente")
        self.assertEqual(product["description"], "Descripción vigente")
        remote.rpc.assert_not_called()
        remote.table.return_value.insert.assert_not_called()
        remote.table.return_value.update.assert_not_called()
        remote.table.return_value.delete.assert_not_called()

    def test_remote_conflict_is_not_reported_as_success(self):
        remote = MagicMock()
        store = StateStore(client=remote)
        store.read = lambda: {"revision": 7, "products": []}
        remote.rpc.return_value.execute.return_value.data = False
        with self.assertRaises(StateConflict):
            store.mutate(lambda data: data["products"].append({"id": "one"}))

    def test_missing_migration_requires_setup(self):
        remote = MagicMock()
        remote.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        with self.assertRaises(StateUnavailable):
            StateStore(client=remote).read()

if __name__ == "__main__":
    unittest.main()
