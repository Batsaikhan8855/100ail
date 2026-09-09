#!/usr/bin/env python3
"""barilga.mn бүтээгдэхүүний каталогийг бүтнээр нь татах scraper."""
import json, re, html, time, sys, os
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.barilga.mn"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
OUT = os.path.dirname(os.path.abspath(__file__))

def get(url, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "mn,en;q=0.8"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if a == retries - 1:
                print(f"  ! FAIL {url}: {e}", file=sys.stderr)
                return None
            time.sleep(1.5 * (a + 1))

def txt(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def money(s):
    if not s: return None
    m = re.search(r"[\d,]+\.?\d*", s.replace("\xa0", ""))
    if not m: return None
    try: return float(m.group(0).replace(",", ""))
    except ValueError: return None

# ---------- 1. Ангиллын мод ----------
def scrape_categories():
    h = get(f"{BASE}/p/") or ""
    cats = {}
    for cid, label in re.findall(r'href="/p/\?cid=(\d+)"[^>]*>(.*?)</a>', h, re.S):
        name = txt(label)
        if name and cid not in cats:
            cats[cid] = name
    return cats

# ---------- 2. Жагсаалтын хуудсууд ----------
def scrape_list_page(page):
    h = get(f"{BASE}/p/?page={page}")
    if not h: return []
    out = []
    for block in h.split('class="product-list-inner')[1:]:
        block = block[:2500]
        m = re.search(r'<a href="/p/(\d+)/">', block)
        if not m: continue
        img = re.search(r'<img src="([^"]+)"', block)
        name = re.search(r'<div class="product-title">.*?<h1><a[^>]*>(.*?)</a></h1>', block, re.S)
        pr = re.search(r'<div class="price">\s*([^<]*)(?:<span class="old">([^<]*)</span>)?', block, re.S)
        out.append({"id": int(m.group(1)),
                    "name": txt(name.group(1)) if name else None,
                    "thumb": img.group(1) if img else None,
                    "price": money(pr.group(1)) if pr else None,
                    "oldPrice": money(pr.group(2)) if pr else None})
    return out

def scrape_all_lists():
    first = get(f"{BASE}/p/") or ""
    pages = [int(p) for p in re.findall(r"[?&]page=(\d+)", first)] or [1]
    last = max(pages)
    # сүүлийн хуудсыг батлах: холбоос цонх хязгаартай тул урагш алхаж шалгана
    while True:
        h = get(f"{BASE}/p/?page={last}") or ""
        more = [int(p) for p in re.findall(r"[?&]page=(\d+)", h)]
        nxt = max(more) if more else last
        if nxt <= last: break
        last = nxt
    print(f"[list] нийт {last} хуудас")
    items, seen = [], set()
    with ThreadPoolExecutor(max_workers=6) as ex:
        for page, rows in zip(range(1, last + 1), ex.map(scrape_list_page, range(1, last + 1))):
            new = [r for r in rows if r["id"] not in seen]
            seen.update(r["id"] for r in new)
            items.extend(new)
            print(f"[list] {page}/{last} -> +{len(new)} (нийт {len(items)})", flush=True)
    return items

# ---------- 3. Дэлгэрэнгүй хуудас ----------
def scrape_detail(pid):
    h = get(f"{BASE}/p/{pid}/")
    if not h: return None
    d = {"id": pid, "url": f"{BASE}/p/{pid}/"}
    i = h.find("product-details-area")
    seg = h[i:i + 12000] if i >= 0 else h

    m = re.search(r'/p/\?cid=(\d+)">(.*?)</a>', seg, re.S)
    if m:
        d["categoryId"] = int(m.group(1)); d["categoryName"] = txt(m.group(2))
    m = re.search(r'<div class="product-name">\s*<h1>(.*?)</h1>', seg, re.S)
    if m: d["name"] = txt(m.group(1))
    m = re.search(r'<div class="date">\s*([\d-]+)', seg)
    if m: d["date"] = m.group(1)
    m = re.search(r'<div class="short-description">(.*?)</div>', seg, re.S)
    if m: d["shortDescription"] = txt(m.group(1)) or None
    m = re.search(r'<div class="price">\s*([^<]*)(?:<span class="old">([^<]*)</span>)?', seg, re.S)
    if m:
        d["price"] = money(m.group(1)); d["oldPrice"] = money(m.group(2))
    m = re.search(r'<div id="product-description"[^>]*>(.*?)</div>', h, re.S)
    if m:
        d["descriptionHtml"] = m.group(1).strip()
        d["description"] = txt(m.group(1)) or None
    # зурагнууд: зөвхөн галерейн блокоос (реклам баннер, og:image-ыг оруулахгүй)
    g0 = h.find("product-big-image")
    g1 = h.find("product-details-area", g0 + 1) if g0 >= 0 else -1
    gallery = h[g0:g1] if g0 >= 0 and g1 > g0 else ""
    SIZE_RANK = ["900x900", "800x450", "450x450", "1920x0", "161x121"]
    by_file, order = {}, []
    for m in re.finditer(r'https://img\.barilga\.mn/([^/\s"\'<>)]+)/files/([^\s"\'<>?)]+)', gallery):
        size, fname = m.group(1).split(",")[0], m.group(2)
        if fname not in by_file:
            by_file[fname] = {}
            order.append(fname)
        by_file[fname].setdefault(size, m.group(0))
    imgs = []
    for fname in order:
        sizes = by_file[fname]
        pick = next((sizes[s] for s in SIZE_RANK if s in sizes), None)
        # `?d=0`-гүй бол CDN 403 буцаадаг тул хаягийг бүтнээр нь хадгална
        if pick: imgs.append(f"{pick}?d=0")
    # Галерейд ихэвчлэн ганц зураг байдаг ч тайлбар дотор нэмэлт гэрэл зураг
    # ордог тул тэдгээрийг ард нь залгана (дэлгэрэнгүй хуудасны галерей).
    d["images"] = imgs + description_images(d.get("descriptionHtml"), imgs)
    return d


# Тайлбар дотор лого, дүрс, тусгаарлагч зэрэг жижиг файл ч оршдог тул
# зөвхөн barilga.mn-ий байршуулсан файлыг, хязгаартайгаар авна.
DESC_IMAGE_LIMIT = 4


def description_images(html_body, already):
    """`descriptionHtml` доторх барааны нэмэлт зургууд."""
    if not html_body:
        return []
    seen = {u.split("/files/")[-1].split("?")[0] for u in already}
    out = []
    for url in re.findall(
        r'https?://(?:www\.)?(?:img\.)?barilga\.mn/[^\s"\'<>)]+?\.(?:jpe?g|png|webp)',
        html_body, re.I,
    ):
        if "/files/" not in url:
            continue
        name = url.split("/files/")[-1].split("?")[0]
        if name in seen:
            continue
        seen.add(name)
        out.append(url)
        if len(out) >= DESC_IMAGE_LIMIT:
            break
    return out

def main():
    cats = scrape_categories()
    json.dump(cats, open(f"{OUT}/categories.json", "w"), ensure_ascii=False, indent=2)
    print(f"[cat] {len(cats)} ангилал")

    items = scrape_all_lists()
    json.dump(items, open(f"{OUT}/listing.json", "w"), ensure_ascii=False, indent=2)
    print(f"[list] нийт {len(items)} бүтээгдэхүүн")

    print("Дараагийн алхам: python3 details.py "
          "(бүтээгдэхүүн бүрийн дэлгэрэнгүйг татаж products.json.gz үүсгэнэ)")


if __name__ == "__main__":
    main()
