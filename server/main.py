"""BOLETA same-origin storefront API. No data writes or remote calls at import."""
import copy
import hashlib
import hmac
import io
import json
import math
import os
import re
import secrets
import threading
import time
import zipfile
from collections import OrderedDict, defaultdict, deque
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Response, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from starlette.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError
from .state import BASE, StateStore, StateUnavailable, StateConflict
from .settings import DEFAULT_SETTINGS, ALLOWED_FONTS

COOKIE = "boleta_admin"
SESSION_TTL = 8 * 3600
EVENTS = {"page_view", "view_product", "select_variant", "add_to_selection", "whatsapp_click", "faq_open", "radio_open", "studio_contact_click", "scroll_25", "scroll_50", "scroll_75", "scroll_100"}


@lru_cache(maxsize=256)
def source_digest(path_string, mtime_ns, file_size):
    """Hash originals once per file revision; no image decoding on the hot path."""
    digest = hashlib.sha256()
    with open(path_string, "rb") as source:
        for block in iter(lambda: source.read(64 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


@lru_cache(maxsize=1)
def thumbnail_bundle(path_string, mtime_ns, file_size):
    """Read only the shipped bounded archive, never a visitor-controlled path.

    WEBP data stays in a single <=4MB cache; corrupt/missing assets safely use
    the existing runtime encoder. ZIP members are read in memory, never extracted.
    """
    try:
        if file_size > 4 * 1024 * 1024:
            return {}
        with zipfile.ZipFile(path_string) as archive:
            info = archive.getinfo("manifest.json")
            if info.file_size > 256 * 1024:
                return {}
            manifest = json.loads(archive.read(info))
            if not isinstance(manifest, dict):
                return {}
            entries = manifest.get("thumbnails", {})
            if manifest.get("version") != 1 or not isinstance(entries, dict) or len(entries) > 1024:
                return {}
            result, total = {}, 0
            for digest, entry in entries.items():
                if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest) or entry != digest + ".webp":
                    return {}
                info = archive.getinfo(entry)
                total += info.file_size
                if info.file_size > 512 * 1024 or total > 4 * 1024 * 1024:
                    return {}
                encoded = archive.read(info)
                if encoded[:4] != b"RIFF" or encoded[8:12] != b"WEBP":
                    return {}
                result[digest] = encoded
            return result
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile):
        return {}


def precomputed_thumbnail(candidate, info):
    bundle = BASE / "server/assets/catalog-thumbnails.zip"
    try:
        bundle_info = bundle.stat()
        entries = thumbnail_bundle(str(bundle), bundle_info.st_mtime_ns, bundle_info.st_size)
        if not entries:
            return None
        digest = source_digest(str(candidate), info.st_mtime_ns, info.st_size)
        return entries.get(digest)
    except OSError:
        return None


# A single decode gate is shared by thumbnail misses and uploads. Pillow may
# need ~100 MB for one allowed 25 MP image; the default 40 ASGI worker threads
# must never decode 40 such images concurrently on a 512 MiB Render instance.
IMAGE_DECODE_LOCK = threading.Lock()
THUMBNAIL_CACHE_MAX_BYTES = 8 * 1024 * 1024
_thumbnail_cache = OrderedDict()
_thumbnail_cache_bytes = 0
_thumbnail_cache_lock = threading.Lock()


def encode_image(source_input, dimensions, quality):
    """Caller holds IMAGE_DECODE_LOCK; release all decoded buffers explicitly."""
    with Image.open(source_input) as source:
        if source.width * source.height > 25000000 or source.format not in {"JPEG", "PNG", "WEBP", "GIF"}:
            raise ValueError()
        source.seek(0)
        # JPEG decoder subsampling happens before any load/EXIF copy. PNG/WebP
        # still require full decoding, but only one is allowed at a time.
        source.draft("RGB", dimensions)
        source.thumbnail(dimensions)
        # Resize before EXIF transpose: orientation changes preserve the bound
        # and this avoids copying the full original just to make a thumbnail.
        with ImageOps.exif_transpose(source) as oriented:
            with oriented.convert("RGBA" if "A" in oriented.getbands() else "RGB") as converted:
                with io.BytesIO() as output:
                    converted.save(output, format="WEBP", quality=quality)
                    return output.getvalue()


def clear_thumbnail_cache():
    global _thumbnail_cache_bytes
    with _thumbnail_cache_lock:
        _thumbnail_cache.clear()
        _thumbnail_cache_bytes = 0


def cached_thumbnail(key):
    with _thumbnail_cache_lock:
        encoded = _thumbnail_cache.get(key)
        if encoded is not None:
            _thumbnail_cache.move_to_end(key)
        return encoded


def thumbnail_bytes(path_string, mtime_ns, file_size):
    """Single-flight misses, bounded by both encoded bytes and entry count."""
    global _thumbnail_cache_bytes
    key = (path_string, mtime_ns, file_size)
    encoded = cached_thumbnail(key)
    if encoded is not None:
        return encoded
    with IMAGE_DECODE_LOCK:
        # Concurrent requests for the same cold image reuse the first result.
        encoded = cached_thumbnail(key)
        if encoded is not None:
            return encoded
        try:
            encoded = encode_image(path_string, (480, 480), 75)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
            raise HTTPException(404, "Imagen no disponible.") from exc
        with _thumbnail_cache_lock:
            if len(encoded) <= THUMBNAIL_CACHE_MAX_BYTES:
                _thumbnail_cache[key] = encoded
                _thumbnail_cache_bytes += len(encoded)
                while len(_thumbnail_cache) > 64 or _thumbnail_cache_bytes > THUMBNAIL_CACHE_MAX_BYTES:
                    _, evicted = _thumbnail_cache.popitem(last=False)
                    _thumbnail_cache_bytes -= len(evicted)
        return encoded


# Keep the established cache reset hook for isolated tests/maintenance.
thumbnail_bytes.cache_clear = clear_thumbnail_cache


def encode_upload(file_object):
    # UploadFile has already spooled large multipart bodies to disk. Wait for the
    # shared decode slot BEFORE reading it, avoiding N concurrent 10 MB buffers.
    with IMAGE_DECODE_LOCK:
        contents = file_object.read(10 * 1024 * 1024 + 1)
        if not contents or len(contents) > 10 * 1024 * 1024:
            raise HTTPException(413, "La imagen debe pesar menos de 10 MB.")
        try:
            with io.BytesIO(contents) as source:
                return encode_image(source, (2000, 2000), 85)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
            raise HTTPException(422, "Archivo de imagen inválido.") from exc


def now():
    return datetime.now(timezone.utc).isoformat()


async def json_object(request):
    try:
        data = await request.json()
    except (ValueError, UnicodeError):
        raise HTTPException(422, "JSON inválido.")
    if not isinstance(data, dict):
        raise HTTPException(422, "Se esperaba un objeto JSON.")
    return data


def text(value, maximum=500):
    if not isinstance(value, str) or len(value) > maximum or any(ord(c) < 32 and c not in "\n\t" for c in value):
        raise HTTPException(422, "Texto inválido o demasiado largo.")
    return value.strip()


def safe_url(value):
    value = text(value, 1500)
    parsed = urlparse(value)
    if ((value.startswith("/") and not value.startswith("//")) or value.startswith(("photos/", "images/"))) and "\\" not in value and ".." not in value.split("/"):
        return value
    if not parsed.netloc or parsed.scheme != "https" or parsed.username or parsed.password:
        raise HTTPException(422, "Usa una URL HTTPS o una ruta local.")
    return value


def number(value, minimum=0, maximum=1000000):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not minimum <= value <= maximum:
        raise HTTPException(422, "Número fuera de rango.")
    return value


def validate_settings(payload):
    if not isinstance(payload, dict):
        raise HTTPException(422, "Configuración inválida.")
    if len(json.dumps(payload)) > 100000:
        raise HTTPException(422, "Configuración demasiado grande.")
    settings = copy.deepcopy(DEFAULT_SETTINGS)
    for key, value in payload.items():
        if key not in settings:
            raise HTTPException(422, "Campo de configuración desconocido.")
        if isinstance(settings[key], dict):
            if not isinstance(value, dict) or set(value) - set(settings[key]):
                raise HTTPException(422, "Campos de configuración inválidos.")
            settings[key].update(value)
        else:
            settings[key] = value
    for section in ("brand", "hero", "fonts", "logistics", "contacts", "radio", "studio"):
        for key, value in settings[section].items():
            text(value, 3000)
            if key in {"image", "secondary_image", "backdrop", "poster", "logo", "url", "playlist_url"}:
                safe_url(value)
    for value in settings["copy"].values():
        text(value, 3000)
    sections = settings["site_sections"]
    allowed_sections = set(DEFAULT_SETTINGS["site_sections"]["order"])
    for field in ("order", "hidden"):
        values = sections[field]
        if isinstance(values, list):
            values = [v for v in values if v != "rewards"]
            sections[field] = values
        if not isinstance(values, list) or not all(isinstance(v, str) for v in values) or len(values) != len(set(values)) or set(values) - allowed_sections:
            raise HTTPException(422, "Lista de secciones inválida.")
    if set(sections["order"]) != allowed_sections or "catalog" in sections["hidden"]:
        raise HTTPException(422, "El catálogo debe permanecer visible y todas las secciones deben tener un orden.")
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", settings["brand"]["accent"]):
        raise HTTPException(422, "Color inválido.")
    if any(f not in ALLOWED_FONTS for f in settings["fonts"].values()):
        raise HTTPException(422, "Selecciona una fuente permitida.")
    for phone in settings["contacts"].values():
        if not re.fullmatch(r"\d{8,15}", phone):
            raise HTTPException(422, "WhatsApp debe incluir código de país.")
    playlist = urlparse(settings["radio"]["playlist_url"])
    if playlist.hostname != "open.spotify.com" or not re.fullmatch(r"/(?:embed/)?playlist/[A-Za-z0-9]+", playlist.path):
        raise HTTPException(422, "Enlace de playlist Spotify inválido.")
    arrival = settings["logistics"]["estimated_arrival"]
    try:
        datetime.strptime(arrival, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise HTTPException(422, "Fecha estimada inválida.")
    if not isinstance(settings["faq"], list) or len(settings["faq"]) > 30:
        raise HTTPException(422, "Máximo 30 preguntas.")
    for faq in settings["faq"]:
        if not isinstance(faq, dict) or set(faq) != {"question", "answer"}:
            raise HTTPException(422, "Pregunta inválida.")
        text(faq["question"], 250)
        text(faq["answer"], 3000)
    payment = settings["payment"]
    if payment["deposit_percent"] is not None:
        number(payment["deposit_percent"], 0, 100)
    if payment["bcv_rate"] is not None:
        number(payment["bcv_rate"], 0.00001, 1000000)
        try:
            datetime.strptime(payment["bcv_date"], "%Y-%m-%d")
        except (TypeError, ValueError):
            raise HTTPException(422, "Indica la fecha de la tasa.")
    # Retired reward configuration is retained as historical data only.
    return settings


def normalize_product(data, existing=None):
    if not isinstance(data, dict) or len(json.dumps(data)) > 100000:
        raise HTTPException(422, "Producto inválido.")
    p = copy.deepcopy(existing or {})
    allowed = {"id", "title", "name", "category", "brand", "numeric_usd", "price", "numeric_bcv", "price_usd", "price_bcv", "image", "image_url", "thumb", "gallery", "sizes", "variants", "material", "description", "tag", "status", "is_purchased", "in_stock", "available", "logistics_status", "quantity", "code", "sold_out"}
    if set(data) - allowed:
        raise HTTPException(422, "Campo de producto desconocido.")
    p.update(data)
    p["id"] = str((existing or {}).get("id") or data.get("id") or secrets.token_hex(8))
    if not re.fullmatch(r"[\w-]{1,80}", p["id"]):
        raise HTTPException(422, "Identificador inválido.")
    p["title"] = text(data.get("name", data.get("title", p.get("title", "Nuevo producto"))), 250)
    p["name"] = p["title"]
    p["numeric_usd"] = number(data.get("price", data.get("numeric_usd", p.get("numeric_usd", 0))))
    p["price"] = p["numeric_usd"]
    p["price_usd"] = f"${p['numeric_usd']:g} USD"
    # BCV is an independent explicit value, never USD times a made-up factor.
    if "numeric_bcv" in data:
        p["numeric_bcv"] = None if data["numeric_bcv"] is None else number(data["numeric_bcv"])
    if "price_bcv" in data:
        p["price_bcv"] = text(data["price_bcv"], 60)
    p["image"] = safe_url(data.get("image_url", data.get("image", p.get("image", "/images/boleta-logo.webp"))))
    p["image_url"] = p["image"]
    p["thumb"] = safe_url(p.get("thumb") or p["image"])
    for field in ("category", "brand", "material", "tag", "code", "logistics_status"):
        p[field] = text(p.get(field, ""), 3000)
    if "description" in data:
        p["material"] = text(data["description"], 3000)
    p["description"] = p["material"]
    for field in ("gallery", "sizes"):
        if not isinstance(p.get(field, []), list) or len(p.get(field, [])) > 100:
            raise HTTPException(422, "Galería o tallas inválidas.")
        p[field] = [safe_url(v) if field == "gallery" else text(v, 80) for v in p.get(field, [])]
    variants = p.get("variants", [])
    if not isinstance(variants, list) or len(variants) > 200:
        raise HTTPException(422, "Variantes inválidas.")
    variant_ids = set()
    for v in variants:
        if not isinstance(v, dict) or set(v) - {"id", "size", "color", "quantity", "price"}:
            raise HTTPException(422, "Variante inválida.")
        variant_id = v.get("id")
        if not isinstance(variant_id, str) or not re.fullmatch(r"[\w-]{1,80}", variant_id) or variant_id in variant_ids:
            raise HTTPException(422, "Cada variante necesita un identificador único.")
        variant_ids.add(variant_id)
        for field in ("id", "size", "color"):
            if field in v:
                text(v[field], 80)
        if "quantity" in v:
            number(v["quantity"], 0, 100000)
            if not isinstance(v["quantity"], int):
                raise HTTPException(422, "Cantidad inválida.")
        if "price" in v:
            number(v["price"])
    if "quantity" in p:
        number(p["quantity"], 0, 100000)
        if not isinstance(p["quantity"], int):
            raise HTTPException(422, "Cantidad inválida.")
    p["variants"] = variants
    p["available"] = data.get("available", data.get("in_stock", p.get("available", True)))
    p["is_purchased"] = data.get("is_purchased", p.get("is_purchased", False))
    if not isinstance(p["available"], bool) or not isinstance(p["is_purchased"], bool):
        raise HTTPException(422, "Estado inválido.")
    p["sold_out"] = data.get("sold_out", p.get("sold_out", False))
    if not isinstance(p["sold_out"], bool):
        raise HTTPException(422, "Estado agotado inválido.")
    p["in_stock"] = p["available"]
    p["status"] = p.get("status", "aprobado")
    if not isinstance(p["status"], str) or p["status"] not in {"aprobado", "descartado", "borrador"}:
        raise HTTPException(422, "Estado inválido.")
    p["updated_at"] = now()
    return p


def build_store():
    client = None
    # dotenv is deliberately not loaded: runtime secrets come from environment.
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if url and key:
        from supabase import create_client
        client = create_client(url, key)
    return StateStore(client=client, allow_local=os.environ.get("BOLETA_ALLOW_LOCAL_STORAGE") == "1")


def create_app(store=None):
    app = FastAPI(title="BOLETA", version="4.0", docs_url=None, redoc_url=None)
    # Compress local scripts/CSS and JSON in transit. API privacy/no-store headers
    # remain applied by the outer response middleware below.
    app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)
    app.state.store = store
    sessions, attempts = {}, defaultdict(deque)
    lock = threading.RLock()

    def repository():
        if app.state.store is None:
            app.state.store = build_store()
        return app.state.store

    def rate(request, label, limit, window):
        # Use direct peer address, not spoofable client-supplied forwarding headers.
        key = (label, request.client.host if request.client else "unknown")
        with lock:
            stamp = time.monotonic()
            q = attempts[key]
            while q and q[0] < stamp - window:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(429, "Demasiados intentos. Espera y vuelve a intentar.")
            q.append(stamp)
            if len(attempts) > 10000:
                for old in list(attempts):
                    if not attempts[old] or attempts[old][-1] < stamp - 3600:
                        attempts.pop(old, None)

    def session(request):
        token = request.cookies.get(COOKIE, "")
        record = sessions.get(hashlib.sha256(token.encode()).hexdigest()) if token else None
        if record and record["expires"] > time.time():
            return record
        return None

    def editor(request: Request):
        record = session(request)
        if not record:
            raise HTTPException(401, "Inicia sesión para editar.")
        if request.method not in {"GET", "HEAD"}:
            check_origin(request)
            if not hmac.compare_digest(request.headers.get("X-CSRF-Token", ""), record["csrf"]):
                raise HTTPException(403, "Token de sesión inválido. Recarga la página.")
        return record

    def check_origin(request):
        origin = request.headers.get("origin")
        expected = os.environ.get("BOLETA_PUBLIC_ORIGIN", "").rstrip("/") or str(request.base_url).rstrip("/")
        if origin and origin.rstrip("/") != expected:
            raise HTTPException(403, "Origen no permitido.")

    def cookie(response, name, value, max_age):
        response.set_cookie(name, value, max_age=max_age, httponly=True, secure=os.environ.get("BOLETA_ENV", "production") != "development", samesite="strict", path="/")

    @app.middleware("http")
    async def headers(request, call_next):
        length = request.headers.get("content-length", "0")
        try:
            if int(length) > 11 * 1024 * 1024:
                return JSONResponse({"detail": "Archivo demasiado grande."}, status_code=413)
        except ValueError:
            return JSONResponse({"detail": "Tamaño inválido."}, status_code=400)
        response = await call_next(request)
        response.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Permissions-Policy": "geolocation=(), microphone=(), camera=()", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self'; frame-src https://open.spotify.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"})
        if request.url.path.startswith("/api/") and request.url.path != "/api/thumbnail":
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(StateUnavailable)
    async def unavailable(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=503)

    @app.exception_handler(StateConflict)
    async def conflict(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=409)

    @app.get("/api/auth/session")
    def auth_session(request: Request, response: Response):
        record = session(request)
        return {"authenticated": bool(record), "csrf_token": record["csrf"] if record else None}

    @app.post("/api/auth/login")
    async def login(request: Request, response: Response):
        check_origin(request)
        rate(request, "login", 8, 900)
        secret = os.environ.get("ADMIN_PASSWORD") or os.environ.get("ADMIN_PIN", "")
        if len(secret) < 10:
            raise HTTPException(503, "Configura una contraseña administrativa de al menos 10 caracteres en el servidor.")
        data = await json_object(request)
        supplied = data.get("password", "") if isinstance(data, dict) else ""
        if not isinstance(supplied, str) or len(supplied) > 1024 or not hmac.compare_digest(supplied.encode(), secret.encode()):
            raise HTTPException(401, "Credenciales incorrectas.")
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with lock:
            for old in list(sessions):
                if sessions[old]["expires"] <= time.time():
                    sessions.pop(old, None)
            sessions[hashlib.sha256(token.encode()).hexdigest()] = {"csrf": csrf, "expires": time.time() + SESSION_TTL}
        cookie(response, COOKIE, token, SESSION_TTL)
        return {"authenticated": True, "csrf_token": csrf}

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response, auth=Depends(editor)):
        token = request.cookies.get(COOKIE, "")
        sessions.pop(hashlib.sha256(token.encode()).hexdigest(), None)
        response.delete_cookie(COOKIE, path="/")
        return {"authenticated": False}

    def read_public():
        try:
            return repository().read(), False
        except StateUnavailable:
            # Read-only last approved repository snapshot; writes still fail closed.
            return repository().seed(), True

    @app.get("/api/health")
    def health():
        repo = repository()
        return {"status": "ok", "storage": repo.mode, "writes_configured": repo.mode != "unconfigured", "session_mode": "single-process", "time": now()}

    @app.get("/api/site-settings")
    def settings(response: Response):
        state, stale = read_public()
        response.headers["X-Boleta-Data-Status"] = "snapshot" if stale else "live"
        # Prize inventory is private; public labels/terms suffice for the display.
        result = copy.deepcopy(state["settings"]["published"])
        result.pop("rewards", None)
        return result

    @app.get("/api/admin/site-settings")
    def admin_settings(auth=Depends(editor)):
        s = repository().read()["settings"]
        return {k: s[k] for k in ("version", "draft", "published")}

    def version_check(settings, version):
        if isinstance(version, bool) or not isinstance(version, int) or settings["version"] != version:
            raise StateConflict("La configuración cambió. Recarga antes de guardar.")

    @app.put("/api/admin/site-settings")
    async def save_settings(request: Request, auth=Depends(editor)):
        body = await json_object(request)
        draft = validate_settings(body.get("settings"))
        def save(state):
            s = state["settings"]
            version_check(s, body.get("version"))
            # Retired campaign settings are an immutable historical record;
            # new editors neither display nor overwrite them.
            draft["rewards"] = copy.deepcopy(s["draft"].get("rewards", DEFAULT_SETTINGS["rewards"]))
            s["version"] += 1
            s["draft"] = draft
            return {"version": s["version"], "draft": s["draft"], "published": s["published"]}
        return repository().mutate(save)

    @app.post("/api/admin/site-settings/publish")
    async def publish(request: Request, auth=Depends(editor)):
        body = await json_object(request)
        def change(state):
            s = state["settings"]
            version_check(s, body.get("version"))
            validate_settings(s["draft"])
            s["history"].append({"version": s["version"], "at": now(), "settings": copy.deepcopy(s["published"])})
            s["history"] = s["history"][-30:]
            s["published"] = copy.deepcopy(s["draft"])
            s["version"] += 1
            return {"version": s["version"], "published": s["published"], "draft": s["draft"]}
        return repository().mutate(change)

    @app.get("/api/admin/site-settings/history")
    def history(auth=Depends(editor)):
        return {"history": repository().read()["settings"]["history"]}

    @app.post("/api/admin/site-settings/restore")
    async def restore(request: Request, auth=Depends(editor)):
        body = await json_object(request)
        def change(state):
            s = state["settings"]
            version_check(s, body.get("version"))
            item = next((h for h in s["history"] if h["version"] == body.get("history_version")), None)
            if item is None:
                raise HTTPException(404, "Versión no encontrada.")
            s["draft"] = copy.deepcopy(item["settings"])
            StateStore.complete(state)
            s["version"] += 1
            return {"version": s["version"], "draft": s["draft"], "published": s["published"]}
        return repository().mutate(change)

    @app.get("/api/products")
    def products(response: Response):
        state, stale = read_public()
        response.headers["X-Boleta-Data-Status"] = "snapshot" if stale else "live"
        return [p for p in state["products"] if p.get("status", "aprobado") == "aprobado"]

    @app.get("/api/thumbnail")
    def thumbnail(src: str):
        # Only repository public photographs. Never fetch URLs, read uploads,
        # arbitrary absolute paths, symlinks outside this directory or private data.
        if not src.startswith("photos/") or "\\" in src or "%" in src or "?" in src or "#" in src or any(part in {".", "..", ""} for part in src.split("/")):
            raise HTTPException(404, "Imagen no disponible.")
        root = (BASE / "dist" / "photos").resolve()
        candidate = (BASE / "dist" / src).resolve()
        if not candidate.is_relative_to(root) or candidate.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"} or not candidate.is_file():
            raise HTTPException(404, "Imagen no disponible.")
        info = candidate.stat()
        if info.st_size > 20 * 1024 * 1024:
            raise HTTPException(404, "Imagen no disponible.")
        encoded = precomputed_thumbnail(candidate, info)
        if encoded is None:
            encoded = thumbnail_bytes(str(candidate), info.st_mtime_ns, info.st_size)
        etag = '"' + hashlib.sha256(encoded).hexdigest()[:24] + '"'
        return Response(encoded, media_type="image/webp", headers={"Cache-Control": "public, max-age=86400", "ETag": etag})

    @app.get("/api/admin/products")
    def all_products(auth=Depends(editor)):
        return repository().read()["products"]

    @app.get("/api/products/{product_id}")
    def product(product_id: str):
        state, _ = read_public()
        found = next((p for p in state["products"] if str(p["id"]) == product_id and p.get("status") == "aprobado"), None)
        if not found:
            raise HTTPException(404, "Producto no encontrado.")
        return found

    async def product_body(request):
        if "application/json" in request.headers.get("content-type", ""):
            return await json_object(request)
        form = await request.form()
        result = {k: v for k, v in form.items() if isinstance(v, str)}
        for key in ("price", "numeric_usd", "numeric_bcv"):
            if key in result:
                try:
                    result[key] = float(result[key])
                except ValueError:
                    raise HTTPException(422, "Precio inválido.")
        for key in ("sizes", "gallery", "variants"):
            if key in result:
                try:
                    result[key] = json.loads(result[key])
                except ValueError:
                    result[key] = [v.strip() for v in result[key].split(",") if v.strip()]
        for key in ("available", "in_stock", "is_purchased", "sold_out"):
            if key in result:
                if result[key].lower() not in {"true", "false"}:
                    raise HTTPException(422, "Estado inválido.")
                result[key] = result[key].lower() == "true"
        if form.get("image_file") and hasattr(form["image_file"], "read"):
            result["image"] = await save_image(form["image_file"])
        return result

    @app.post("/api/products")
    async def add_product(request: Request, auth=Depends(editor)):
        p = normalize_product(await product_body(request))
        def add(state):
            if any(str(i["id"]) == p["id"] for i in state["products"]):
                raise HTTPException(409, "Identificador ya utilizado.")
            state["products"].append(p)
            return p
        return repository().mutate(add)

    @app.post("/api/products/merge")
    async def merge(request: Request, auth=Depends(editor)):
        data = await json_object(request)
        if data.get("source_id") == data.get("target_id"):
            raise HTTPException(422, "Selecciona productos diferentes.")
        def change(state):
            source = next((p for p in state["products"] if str(p["id"]) == str(data.get("source_id"))), None)
            target = next((p for p in state["products"] if str(p["id"]) == str(data.get("target_id"))), None)
            if not source or not target:
                raise HTTPException(404, "Producto no encontrado.")
            target["gallery"] = list(dict.fromkeys(target.get("gallery", []) + [source["image"]] + source.get("gallery", [])))
            target["gallery"] = [p for p in target["gallery"] if p != target["image"]]
            source["status"] = "descartado"
            return {"success": True, "target_product": target}
        return repository().mutate(change)

    @app.put("/api/products/{product_id}")
    @app.patch("/api/products/{product_id}")
    async def update_product(product_id: str, request: Request, auth=Depends(editor)):
        body = await product_body(request)
        def change(state):
            for index, p in enumerate(state["products"]):
                if str(p["id"]) == product_id:
                    updated = normalize_product(body, p)
                    state["products"][index] = updated
                    return updated
            raise HTTPException(404, "Producto no encontrado.")
        return repository().mutate(change)

    @app.delete("/api/products/{product_id}")
    def archive(product_id: str, auth=Depends(editor)):
        def change(state):
            found = next((p for p in state["products"] if str(p["id"]) == product_id), None)
            if not found:
                raise HTTPException(404, "Producto no encontrado.")
            found["status"] = "descartado"
            return {"success": True}
        return repository().mutate(change)

    async def save_image(file):
        # Pillow and file reads run in the worker pool; the shared gate bounds
        # memory without blocking the event loop or changing durable storage.
        contents = await run_in_threadpool(encode_upload, file.file)
        name = secrets.token_hex(20) + ".webp"
        repo = repository()
        # Confirm durable state is available before accepting a media write.
        repo.read()
        if repo.client is not None:
            try:
                repo.client.storage.from_("product-images").upload(name, contents, {"content-type": "image/webp"})
                return repo.client.storage.from_("product-images").get_public_url(name)
            except Exception as exc:
                raise StateUnavailable("No se subió la imagen. Reintenta.") from exc
        if not repo.allow_local:
            raise StateUnavailable("Almacenamiento de imágenes sin configurar.")
        folder = repo.data_dir / "uploads"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / name).write_bytes(contents)
        return "/api/media/" + name

    @app.post("/api/upload")
    async def upload(file: UploadFile = File(...), auth=Depends(editor)):
        url = await save_image(file)
        return {"url": url, "image_url": url, "success": True}

    @app.get("/api/media/{filename}")
    def local_media(filename: str):
        if not re.fullmatch(r"[a-f0-9]{40}\.webp", filename):
            raise HTTPException(404)
        repo = repository()
        if not repo.allow_local:
            raise HTTPException(404)
        path = repo.data_dir / "uploads" / filename
        if not path.exists():
            raise HTTPException(404)
        return FileResponse(path, media_type="image/webp")

    @app.post("/api/products/{product_id}/image")
    async def main_image(product_id: str, file: UploadFile = File(...), auth=Depends(editor)):
        state = repository().read()
        if not any(str(p["id"]) == product_id for p in state["products"]):
            raise HTTPException(404, "Producto no encontrado.")
        url = await save_image(file)
        def change(s):
            p = next((p for p in s["products"] if str(p["id"]) == product_id), None)
            if not p:
                raise HTTPException(404, "Producto no encontrado.")
            p.update({"image": url, "image_url": url, "thumb": url})
            return {"success": True, "image_url": url, "product": p}
        return repository().mutate(change)

    @app.post("/api/leads")
    async def lead(request: Request):
        check_origin(request)
        rate(request, "leads", 5, 3600)
        data = await json_object(request)
        if data.get("website"):
            return {"success": True}
        if data.get("consent") is not True:
            raise HTTPException(422, "Debes aceptar el tratamiento de tus datos de contacto.")
        marketing_consent = data.get("marketing_consent", False)
        if not isinstance(marketing_consent, bool):
            raise HTTPException(422, "Consentimiento promocional inválido.")
        name = text(data.get("name"), 100)
        phone = re.sub(r"[\s()+.-]", "", text(data.get("whatsapp"), 30))
        if not name or not re.fullmatch(r"[1-9]\d{7,14}", phone):
            raise HTTPException(422, "Escribe tu nombre y WhatsApp con código de país.")
        consent_version = text(data.get("consent_version", ""), 100)
        if not consent_version:
            raise HTTPException(422, "Falta la versión del consentimiento.")
        def change(state):
            existing = next((l for l in state["leads"] if l["whatsapp"] == phone), None)
            record = {"name": name, "whatsapp": phone, "consent": True, "marketing_consent": marketing_consent, "consent_version": consent_version, "consented_at": now()}
            if existing:
                existing.update(record)
            else:
                record["id"] = secrets.token_hex(12)
                state["leads"].append(record)
            return {"success": True}
        return repository().mutate(change)

    @app.get("/api/admin/leads")
    def leads(auth=Depends(editor)):
        return {"leads": repository().read()["leads"]}

    @app.delete("/api/admin/leads/{lead_id}")
    def delete_lead(lead_id: str, auth=Depends(editor)):
        def change(state):
            previous = len(state["leads"])
            state["leads"] = [lead for lead in state["leads"] if lead.get("id") != lead_id]
            if len(state["leads"]) == previous:
                raise HTTPException(404, "Contacto no encontrado.")
            return {"success": True}
        return repository().mutate(change)

    @app.post("/api/events")
    async def event(request: Request):
        check_origin(request)
        rate(request, "events", 120, 60)
        data = await json_object(request)
        # Reject all free-form properties: never store search text, names or IPs.
        if not isinstance(data, dict) or set(data) - {"event", "product_id"} or data.get("event") not in EVENTS:
            raise HTTPException(422, "Evento inválido.")
        def change(state):
            stats = state["stats"]
            label = data["event"]
            stats["events"][label] = stats["events"].get(label, 0) + 1
            day = now()[:10]
            stats["daily"][day] = stats["daily"].get(day, 0) + 1
            stats["daily"] = dict(sorted(stats["daily"].items())[-366:])
            stats["totals"] += 1
            return {"success": True}
        return repository().mutate(change)

    @app.get("/api/admin/stats")
    def stats(auth=Depends(editor)):
        state = repository().read()
        return {**state["stats"], "leads_count": len(state["leads"]), "note": "Clics en WhatsApp no confirman conversaciones ni pagos."}

    @app.post("/api/rewards/spin")
    async def retired_spin():
        raise HTTPException(410, "Esta función fue retirada.")

    if (BASE / "dist").exists():
        app.mount("/", StaticFiles(directory=BASE / "dist", html=True), name="storefront")
    return app


app = create_app()
