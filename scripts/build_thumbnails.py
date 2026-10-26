"""Build a deterministic archive of public catalogue cover thumbnails.

Run after changing committed catalogue photographs:
    python scripts/build_thumbnails.py
Only covers referenced by the public catalogue are bundled by default; pass
--include-gallery for detail thumbnails or --all-public for every public photo.
Originals remain untouched. New/unbundled images use the runtime fallback.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

from PIL import Image, ImageOps

BASE = Path(__file__).resolve().parents[1]
FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def public_source(root, value):
    if not isinstance(value, str) or not value.startswith(("photos/", "/photos/")):
        return None
    relative = value.lstrip("/")
    if "\\" in relative or any(p in {"", ".", ".."} for p in relative.split("/")):
        return None
    photos = (root / "dist/photos").resolve()
    candidate = (root / "dist" / relative).resolve()
    return candidate if candidate.is_relative_to(photos) and candidate.is_file() and candidate.suffix.lower() in FORMATS else None


def cover_sources(root, include_gallery=False, all_public=False):
    if all_public:
        candidates = (root / "dist/photos").glob("*")
        values = ["photos/" + p.name for p in candidates if p.is_file()]
    else:
        products = json.loads((root / "dist/data/products.json").read_text(encoding="utf-8"))
        values = []
        for product in products:
            values.append(product.get("thumb") or product.get("image") or product.get("image_url"))
            if include_gallery:
                gallery = product.get("gallery") or []
                if isinstance(gallery, list):
                    values.extend(gallery)
    return sorted({p for value in values if (p := public_source(root, value))}, key=lambda p: p.as_posix())


def thumbnail_bytes(source, size=400, quality=72):
    with Image.open(source) as image:
        if image.width * image.height > 25000000 or image.format not in {"JPEG", "PNG", "WEBP", "GIF"}:
            raise ValueError("Unsupported or oversized public image: " + str(source))
        image.seek(0)
        image = ImageOps.exif_transpose(image)
        image.thumbnail((size, size))
        stream = io.BytesIO()
        image.convert("RGBA" if "A" in image.getbands() else "RGB").save(stream, "WEBP", quality=quality, method=4)
    return stream.getvalue()


def build_bundle(root=BASE, output=None, size=400, quality=72, include_gallery=False, all_public=False):
    root = Path(root)
    output = Path(output or root / "server/assets/catalog-thumbnails.zip")
    files, manifest = {}, {"version": 1, "size": size, "quality": quality, "thumbnails": {}}
    for source in cover_sources(root, include_gallery=include_gallery, all_public=all_public):
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        entry = digest + ".webp"
        files[entry] = thumbnail_bytes(source, size=size, quality=quality)
        manifest["thumbnails"][digest] = entry
    files["manifest.json"] = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return len(manifest["thumbnails"]), output.stat().st_size


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--size", type=int, choices=(400, 480), default=400)
    parser.add_argument("--quality", type=int, choices=range(40, 91), default=72)
    parser.add_argument("--include-gallery", action="store_true")
    parser.add_argument("--all-public", action="store_true")
    args = parser.parse_args()
    count, size = build_bundle(size=args.size, quality=args.quality, include_gallery=args.include_gallery, all_public=args.all_public)
    print(f"{count} thumbnails; {size:,} bytes; originals unchanged.")


if __name__ == "__main__":
    main()
