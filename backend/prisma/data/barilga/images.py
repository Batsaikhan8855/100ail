#!/usr/bin/env python3
"""Барааны зургийг эх сайтаас татаж `backend/media/barilga/` дор хадгална.

img.barilga.mn нь `?d=0` парametrгүй хүсэлтийг 403-аар хаадаг бөгөөд зургаа
шууд холбох (hotlink) нь найдваргүй тул зургийг өөр дээрээ буулгаж авна.

Дахин ажиллуулахад аль хэдийн татсан файлыг алгасна.
"""
import json, os, sys, threading, subprocess, shutil
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
API_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))  # backend/
MEDIA = os.path.join(API_ROOT, os.environ.get("MEDIA_DIR", "media"), "barilga")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
MAX_EDGE = int(os.environ.get("IMAGE_MAX_EDGE", "500"))
# Бүтээгдэхүүн тус бүрээс хэдэн зураг татах вэ (сангийн хэмжээг барина)
MAX_PER_PRODUCT = int(os.environ.get("IMAGE_MAX_PER_PRODUCT", "3"))
SIPS = shutil.which("sips")  # macOS-ийн хэмжээ өөрчлөгч (байхгүй бол алгасна)


def source_urls():
    """details.jsonl эсвэл products.json.gz-оос зургийн хаягуудыг цуглуулна."""
    jsonl = os.path.join(HERE, "details.jsonl")
    gz_path = os.path.join(HERE, "products.json.gz")
    rows = []
    if os.path.exists(jsonl):
        for line in open(jsonl, encoding="utf-8"):
            try: rows.append(json.loads(line))
            except Exception: pass
    elif os.path.exists(gz_path):
        import gzip
        with gzip.open(gz_path, "rb") as gz:
            rows = json.loads(gz.read().decode("utf-8"))
    else:
        sys.exit("details.jsonl ч, products.json.gz ч алга — эхлээд details.py-г ажиллуулна уу")
    urls = []
    seen = set()
    for row in rows:
        for url in (row.get("images") or [])[:MAX_PER_PRODUCT]:
            name = url.split("/files/")[-1].split("?")[0]
            if name not in seen:
                seen.add(name)
                urls.append((name, url))
    return urls


lock = threading.Lock()
stats = {"ok": 0, "skip": 0, "fail": 0, "bytes": 0}


def fetch(job):
    name, url = job
    dest = os.path.join(MEDIA, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        with lock: stats["skip"] += 1
        return
    # `?d=0` заавал шаардлагатай — эс бөгөөс 403
    req = urllib.request.Request(f"{url}?d=0", headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                body = response.read()
            tmp = f"{dest}.part"
            with open(tmp, "wb") as fh:
                fh.write(body)
            if SIPS:
                # Дэлгэцэнд 500px хүрэлцэнэ — сангийн хэмжээг ~3 дахин багасгана
                subprocess.run([SIPS, "-Z", str(MAX_EDGE), "-s", "formatOptions", "72", tmp],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            os.replace(tmp, dest)
            with lock:
                stats["ok"] += 1
                stats["bytes"] += os.path.getsize(dest)
                done = stats["ok"] + stats["skip"] + stats["fail"]
                if done % 200 == 0:
                    print(f"  {done} ({stats['ok']} шинэ, {stats['skip']} байсан, "
                          f"{stats['fail']} алдаа, {stats['bytes'] // 1048576}MB)", flush=True)
            return
        except Exception as error:
            if attempt == 2:
                with lock: stats["fail"] += 1
                print(f"  ! {url}: {error}", file=sys.stderr)


def main():
    os.makedirs(MEDIA, exist_ok=True)
    jobs = source_urls()
    print(f"Зураг: {len(jobs)} файл -> {MEDIA}")
    if not SIPS:
        print("  (sips олдсонгүй — зургийг эх хэмжээгээр нь хадгална)")
    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(fetch, jobs))
    print(f"Дуусав: {stats['ok']} татсан, {stats['skip']} өмнө нь байсан, "
          f"{stats['fail']} алдаа, нийт {stats['bytes'] // 1048576}MB")


if __name__ == "__main__":
    main()
