"""Manual local benchmark: python scripts/benchmark_image_memory.py

Runs old and current cold-thumbnail algorithms in separate child processes.
Uses synthetic 12.48 MP JPEGs, never production images, DB or storage.
Peak RSS includes the Python/Pillow import baseline; results are lab evidence,
not a prediction of Render's allocator or total ASGI process memory.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import ctypes
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image, ImageOps


def peak_rss():
    if os.name == "nt":
        from ctypes import wintypes
        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD)] + [(k, ctypes.c_size_t) for k in ("PeakWorkingSetSize", "WorkingSetSize", "QuotaPeakPagedPoolUsage", "QuotaPagedPoolUsage", "QuotaPeakNonPagedPoolUsage", "QuotaNonPagedPoolUsage", "PagefileUsage", "PeakPagefileUsage")]
        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        ctypes.windll.psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        ctypes.windll.kernel32.GetCurrentProcess.restype = wintypes.HANDLE
        if not ctypes.windll.psapi.GetProcessMemoryInfo(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
            raise ctypes.WinError()
        return counters.PeakWorkingSetSize
    import resource
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return value if sys.platform == "darwin" else value * 1024


def worker(mode, fixture):
    from server.main import thumbnail_bytes
    baseline = peak_rss()
    def make(index):
        if mode == "current":
            return thumbnail_bytes(fixture, index, index)
        with Image.open(fixture) as source:
            source.seek(0)
            source = ImageOps.exif_transpose(source)
            source.thumbnail((480, 480))
            output = io.BytesIO()
            source.convert("RGB").save(output, format="WEBP", quality=75)
            return output.getvalue()
    started = time.perf_counter()
    with ThreadPoolExecutor(max_workers=4) as pool:
        data = list(pool.map(make, range(4)))
    return {"mode": mode, "workers": 4, "source_pixels": 12480000, "baseline_mib": round(baseline / 1048576, 1), "peak_rss_mib": round(peak_rss() / 1048576, 1), "elapsed_ms": round((time.perf_counter()-started)*1000), "outputs": len(data)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", choices=("legacy", "current"))
    parser.add_argument("--fixture")
    args = parser.parse_args()
    if args.worker:
        print(json.dumps(worker(args.worker, args.fixture)))
    else:
        with tempfile.TemporaryDirectory() as folder:
            fixture = Path(folder) / "synthetic.jpg"
            with Image.new("RGB", (4000, 3120), "purple") as image:
                image.save(fixture, quality=85)
            results = []
            for mode in ("legacy", "current"):
                value = subprocess.run([sys.executable, __file__, "--worker", mode, "--fixture", str(fixture)], check=True, capture_output=True, text=True)
                results.append(json.loads(value.stdout))
            print(json.dumps(results, indent=2))
