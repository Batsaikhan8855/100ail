#!/usr/bin/env python3
"""listing.json дахь ID бүрийн дэлгэрэнгүйг татна. Тасарвал үргэлжлүүлж болно."""
import json, os, sys, threading
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import scrape_detail, description_images

OUT = os.path.dirname(os.path.abspath(__file__))
JSONL = f"{OUT}/details.jsonl"

items = json.load(open(f"{OUT}/listing.json", encoding="utf-8"))
done = set()
if os.path.exists(JSONL):
    for line in open(JSONL, encoding="utf-8"):
        try: done.add(json.loads(line)["id"])
        except Exception: pass
todo = [r["id"] for r in items if r["id"] not in done]
print(f"нийт {len(items)}, татсан {len(done)}, үлдсэн {len(todo)}", flush=True)

lock = threading.Lock()
fh = open(JSONL, "a", encoding="utf-8")
count = 0

def work(pid):
    global count
    d = scrape_detail(pid)
    with lock:
        count += 1
        if d:
            fh.write(json.dumps(d, ensure_ascii=False) + "\n")
        if count % 100 == 0:
            fh.flush()
            print(f"[detail] {count}/{len(todo)}", flush=True)

with ThreadPoolExecutor(max_workers=8) as ex:
    list(ex.map(work, todo))
fh.close()


def finish():
    """details.jsonl -> products.json.gz (импортод ашиглагдах эцсийн файл)."""
    import gzip
    rows = {}
    for line in open(JSONL, encoding="utf-8"):
        try:
            row = json.loads(line)
        except Exception:
            continue
        # Тайлбар доторх нэмэлт зургийг галерейд оруулаад (аль хэдийн
        # татсан мөрүүдэд ч хүчинтэй болгохын тулд энд дахин хийнэ),
        # descriptionHtml, thumb-ыг хасна (файлын хэмжээ)
        images = row.get("images") or []
        row["images"] = images + description_images(row.get("descriptionHtml"), images)
        row.pop("descriptionHtml", None)
        row.pop("thumb", None)
        rows[row["id"]] = row
    order = {r["id"]: i for i, r in enumerate(items)}
    out = sorted(rows.values(), key=lambda r: order.get(r["id"], 10**9))
    body = json.dumps(out, ensure_ascii=False).encode("utf-8")
    with gzip.open(f"{OUT}/products.json.gz", "wb") as gz:
        gz.write(body)
    # Шахаагүй хуучин хувилбар үлдвэл импорт хуучин өгөгдөл уншиж мэдэх тул арилгана
    stale = f"{OUT}/products.json"
    if os.path.exists(stale):
        os.remove(stale)
    print(f"[detail] products.json.gz: {len(out)} бүтээгдэхүүн, "
          f"{os.path.getsize(f'{OUT}/products.json.gz') // 1024} KB", flush=True)


finish()
print("[detail] дууслаа. Дараагийн алхам: python3 images.py, дараа нь "
      "backend дотор npm run db:import:barilga", flush=True)
