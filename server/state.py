"""Private, versioned state; never silently falls back after a remote failure.

Production uses one Supabase PostgreSQL row with compare-and-swap RPC. See
docs/supabase-redesign.sql. Explicit BOLETA_ALLOW_LOCAL_STORAGE=1 is only for
development or a verified persistent disk. Importing this module writes nothing.
"""
import copy
import json
import os
import sqlite3
import threading
from contextlib import closing
from pathlib import Path
from .settings import DEFAULT_SETTINGS

BASE = Path(__file__).resolve().parents[1]


class StateUnavailable(Exception):
    pass


class StateConflict(Exception):
    pass


class StateStore:
    def __init__(self, data_dir=None, client=None, allow_local=False):
        self.data_dir = Path(data_dir or os.environ.get("BOLETA_DATA_DIR", str(BASE / "data" / "runtime")))
        self.client = client
        self.allow_local = allow_local
        self.lock = threading.RLock()
        self.mode = "supabase" if client is not None else "local" if allow_local else "unconfigured"

    @staticmethod
    def complete(document):
        """Add new editor defaults without replacing previously saved decisions."""
        for mode in ("draft", "published"):
            settings = document["settings"][mode]
            for key, default in DEFAULT_SETTINGS.items():
                if key not in settings:
                    settings[key] = copy.deepcopy(default)
                elif isinstance(default, dict):
                    for field, value in default.items():
                        settings[key].setdefault(field, copy.deepcopy(value))
            for field in ("order", "hidden"):
                settings["site_sections"][field] = [v for v in settings["site_sections"][field] if v != "rewards"]
        return document

    def seed(self):
        # The approved local snapshot is read-only. Never re-import Telegram here.
        path = Path(os.environ.get("BOLETA_CATALOG_SOURCE", str(BASE / "dist" / "data" / "products.json")))
        products = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        return {"revision": 0, "products": products, "settings": {"version": 0, "draft": copy.deepcopy(DEFAULT_SETTINGS), "published": copy.deepcopy(DEFAULT_SETTINGS), "history": []}, "leads": [], "stats": {"events": {}, "daily": {}, "totals": 0}, "spins": {}}

    def _connection(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.data_dir / "editor-state.sqlite3", timeout=15)
        conn.execute("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id=1), document TEXT NOT NULL)")
        return conn

    def read(self):
        try:
            if self.client is not None:
                rows = self.client.table("boleta_state").select("document").eq("id", "catalog").execute().data
                if not rows:
                    raise StateUnavailable("Ejecuta la migración de persistencia antes de editar.")
                document = rows[0]["document"]
                if "products" not in document:
                    # First mutation adopts the live remote catalog. Existing products
                    # table is never rewritten or deleted by the redesign.
                    initial = self.seed()
                    initial["revision"] = document.get("revision", 0)
                    live = self.client.table("products").select("*").execute().data
                    if live:
                        lookup = {str(p["id"]): p for p in initial["products"]}
                        merged = []
                        for row in live:
                            p = copy.deepcopy(lookup.get(str(row["id"]), {}))
                            seed_gallery = p.get("gallery") or []
                            p.update({k: v for k, v in row.items() if v is not None})
                            p.update({"id": str(row["id"]), "title": row.get("name") or row.get("title") or "Producto", "numeric_usd": row.get("price") if row.get("price") is not None else p.get("numeric_usd", 0), "image": row.get("image_url") or row.get("image") or p.get("image") or "/images/boleta-logo.webp", "available": row.get("available", True), "status": "aprobado" if row.get("available", True) else "descartado"})
                            # Legacy installations use images JSONB instead of gallery.
                            # Merge all known photos without replacing the live cover.
                            photos = []
                            for group in (seed_gallery, row.get("gallery"), row.get("images")):
                                if isinstance(group, list):
                                    photos.extend(v for v in group if isinstance(v, str) and v.strip())
                            p["gallery"] = [v for v in dict.fromkeys(photos) if v != p["image"]]
                            p["name"] = p["title"]
                            p["image_url"] = p["image"]
                            p["thumb"] = row.get("thumb") or p["image"]
                            p["in_stock"] = p["available"]
                            if row.get("description") is not None:
                                p["material"] = row["description"]
                            elif row.get("material") is not None:
                                p["material"] = row["material"]
                            p["description"] = p.get("material", "")
                            p["price_usd"] = f"${float(p['numeric_usd']):g} USD"
                            p.setdefault("sizes", ["Única"])
                            merged.append(p)
                        initial["products"] = merged
                    return initial
                return self.complete(document)
            if not self.allow_local:
                raise StateUnavailable("Persistencia sin configurar.")
            with closing(self._connection()) as conn:
                row = conn.execute("SELECT document FROM app_state WHERE id=1").fetchone()
            return self.complete(json.loads(row[0])) if row else self.seed()
        except StateUnavailable:
            raise
        except Exception as exc:
            raise StateUnavailable("No se pudo consultar la persistencia.") from exc

    def mutate(self, operation):
        with self.lock:
            if self.client is not None:
                state = self.read()
                previous = state["revision"]
                result = operation(state)
                state["revision"] = previous + 1
                try:
                    response = self.client.rpc("boleta_state_compare_swap", {"expected_revision": previous, "next_document": state}).execute()
                    if response.data is not True:
                        raise StateConflict("Los datos cambiaron. Recarga y reintenta.")
                except StateConflict:
                    raise
                except Exception as exc:
                    raise StateUnavailable("No se guardó el cambio remoto. Reintenta.") from exc
                return result
            if not self.allow_local:
                raise StateUnavailable("Persistencia sin configurar; no se guardó el cambio.")
            with closing(self._connection()) as conn, conn:
                conn.execute("BEGIN IMMEDIATE")
                row = conn.execute("SELECT document FROM app_state WHERE id=1").fetchone()
                state = self.complete(json.loads(row[0])) if row else self.seed()
                result = operation(state)
                state["revision"] += 1
                conn.execute("INSERT INTO app_state(id,document) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document", (json.dumps(state, ensure_ascii=False),))
            return result
