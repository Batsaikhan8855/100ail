#!/usr/bin/env python3
"""`backend/media/barilga/` дэх зургийг WebP болгож Vercel-ийн CDN руу бэлдэнэ.

Яагаад: эх сайтын CDN (`img.barilga.mn`) нь гаднаас холбохыг хаадаг —
`?d=0`-гүй хүсэлтэд 403, түүнтэй хүсэлтэд огт хариу өгөхгүй. Тиймээс зураг
өөрсдийн домэйноос ирэх ёстой. Render-ийн үнэгүй instance нь 5000 гаруй
файл өгөхөд тохиромжгүй тул зургийг frontend-ийн `public/` дор тавьж
Vercel-ийн CDN-ээр өгнө.

Гаралт:
  frontend/storefront/public/media/barilga/<хэш>.webp   — зураг өөрөө
  backend/prisma/data/barilga/images.json.gz            — импортын жагсаалт

Жагсаалт (manifest) заавал хэрэгтэй: импорт Render дээр ажилладаг ба тэнд
зургийн файл байхгүй тул `fs.existsSync`-ээр шалгах боломжгүй. Оронд нь
энэ жагсаалтаас аль зураг CDN дээр байгааг мэдэж авна.

Ашиглах:
    python3 webp.py

Дахин ажиллуулахад хөрвүүлсэн файлыг алгасна (`--force` бол дахин хийнэ).
"""
import gzip
import json
import os
import shutil
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REPO = os.path.abspath(os.path.join(BACKEND, ".."))

SOURCE = os.path.join(BACKEND, os.environ.get("MEDIA_DIR", "media"), "barilga")
DEST = os.path.join(REPO, "frontend", "storefront", "public", "media", "barilga")
MANIFEST = os.path.join(HERE, "images.json.gz")

# Эх зураг 500px, харагдах хамгийн том хайрцаг 288x228 CSS px
# (`product-detail.tsx` — 320px багана, дотор нь p-4). 440px нь тэр
# хайрцагт retina дэлгэцэнд хангалттай.
#
# Хэмжээг Vercel-ийн Hobby тарифын 100MB-ийн статик хязгаарт багтаах
# ёстой. Бүх 5,451 зургийн нийт хэмжээ бодитоор:
#   500px q80 -> 107MB (хязгаараас давна)
#   440px q76 ->  67MB  <- анхдагч
#   400px q74 ->  56MB
MAX_EDGE = int(os.environ.get("WEBP_MAX_EDGE", "440"))
QUALITY = int(os.environ.get("WEBP_QUALITY", "76"))
WORKERS = int(os.environ.get("WEBP_WORKERS", "8"))
FORCE = "--force" in sys.argv

CWEBP = shutil.which("cwebp")
# `cwebp` нь GIF уншдаггүй — тэдгээрт `gif2webp` хэрэгтэй (мөн webp багцад
# ирдэг). Байхгүй бол GIF алгасагдаж, тухайн бараа вектор дүрслэлээр гарна.
GIF2WEBP = shutil.which("gif2webp")
SKIP_EXT = {".webp"}

lock = threading.Lock()
# src_bytes/out_bytes нь зөвхөн ЭНЭ ажиллалтад хөрвүүлсэн файлыг тоолно
# (харьцааг зөв гаргахын тулд); total_bytes нь гаралтын сангийн бүх файл.
stats = {"ok": 0, "skip": 0, "fail": 0, "src_bytes": 0, "out_bytes": 0, "total_bytes": 0}


def sources():
    """Хөрвүүлэх (эх зам, гаралтын нэр) хосуудыг цуглуулна."""
    if not os.path.isdir(SOURCE):
        sys.exit(f"Эх сан алга: {SOURCE}\nЭхлээд python3 images.py-г ажиллуулна уу.")
    jobs = []
    for name in sorted(os.listdir(SOURCE)):
        stem, ext = os.path.splitext(name)
        if ext.lower() in SKIP_EXT or name.startswith("."):
            continue
        path = os.path.join(SOURCE, name)
        if os.path.isfile(path) and os.path.getsize(path) > 0:
            jobs.append((path, f"{stem}.webp"))
    return jobs


def convert(job):
    src, out_name = job
    dest = os.path.join(DEST, out_name)

    if not FORCE and os.path.exists(dest) and os.path.getsize(dest) > 0:
        with lock:
            stats["skip"] += 1
            stats["total_bytes"] += os.path.getsize(dest)
        return out_name

    is_gif = src.lower().endswith(".gif")
    if is_gif and not GIF2WEBP:
        with lock:
            stats["fail"] += 1
        return None

    # gif2webp нь хэмжээ өөрчлөх сонголтгүй; GIF цөөхөн тул хэвээр үлдээнэ.
    command = (
        [GIF2WEBP, "-quiet", "-q", str(QUALITY), src, "-o", dest]
        if is_gif
        else [CWEBP, "-quiet", "-q", str(QUALITY), "-resize", str(MAX_EDGE), "0",
              src, "-o", dest]
    )

    try:
        subprocess.run(command, check=True, capture_output=True)
        with lock:
            stats["ok"] += 1
            stats["src_bytes"] += os.path.getsize(src)
            stats["out_bytes"] += os.path.getsize(dest)
            stats["total_bytes"] += os.path.getsize(dest)
            done = stats["ok"] + stats["skip"]
            if done % 500 == 0:
                print(f"  {done} файл...", flush=True)
        return out_name
    except subprocess.CalledProcessError as error:
        with lock:
            stats["fail"] += 1
        detail = (error.stderr or b"").decode("utf-8", "replace").strip()
        print(f"  ! {os.path.basename(src)}: {detail}", file=sys.stderr)
        return None


def main():
    if not CWEBP:
        sys.exit("cwebp олдсонгүй. Суулгах: brew install webp")

    os.makedirs(DEST, exist_ok=True)
    jobs = sources()
    print(f"Зураг: {len(jobs)} файл — {MAX_EDGE}px, чанар {QUALITY}")
    print(f"  {SOURCE}\n  -> {DEST}")

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        names = [name for name in pool.map(convert, jobs) if name]

    # `-resize`-ийн улмаас эх зургаас том гарсан файл байвал ч хамаагүй —
    # жагсаалт нь зөвхөн аль зураг CDN дээр байгааг л заана.
    with gzip.open(MANIFEST, "wt", encoding="utf-8") as gz:
        json.dump(sorted(names), gz, separators=(",", ":"))

    print(
        f"Дуусав: {stats['ok']} хөрвүүлсэн, {stats['skip']} өмнө нь байсан, "
        f"{stats['fail']} алдаа"
    )
    if stats["src_bytes"]:
        saved = 100 - stats["out_bytes"] * 100 // stats["src_bytes"]
        print(
            f"  шинээр хөрвүүлсэн: {stats['src_bytes'] // 1048576}MB -> "
            f"{stats['out_bytes'] // 1048576}MB ({saved}% багассан)"
        )
    print(f"  нийт гаралт: {stats['total_bytes'] // 1048576}MB, {len(names)} файл")
    print(f"  жагсаалт: {MANIFEST}")


if __name__ == "__main__":
    main()
