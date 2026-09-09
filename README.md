# 100 Айл

Барилгын материалын олон нийлүүлэгчтэй marketplace. Архитектурын дэлгэрэнгүй
тайлбарыг [`100-ail-ecommerce-architecture copy.md`](./100-ail-ecommerce-architecture%20copy.md)
файлаас уншина уу.

```text
backend/              NestJS + Prisma API (modular monolith)   :4000
frontend/storefront   Худалдан авагчийн веб                     :3100
frontend/supplier     Нийлүүлэгчийн систем                      :3200
frontend/admin        Admin panel                               :3300
```

## Хурдан эхлэл

```bash
# 1. Дэд бүтэц (PostgreSQL, Redis, Meilisearch)
docker compose up -d db redis meilisearch

# 2. Backend
cd backend && cp .env.example .env && npm install
npm run db:push && npm run db:seed
cd .. && npm run dev:backend            # http://localhost:4000/api

# 3. Веб аппууд (тус бүрдээ npm install хийнэ)
npm run dev:storefront   # http://localhost:3100
npm run dev:supplier     # http://localhost:3200
npm run dev:admin        # http://localhost:3300
```

Бүх орчныг Docker-оор өргөх бол: `docker compose up -d --build`.

## Гол боломжууд

- Нэг бараан дор олон нийлүүлэгчийн үнэ, үлдэгдэл, хүргэлтийн харьцуулалт
- Нийлүүлэгчийн Excel/CSV импорт (үнэ, үлдэгдэл бөөнөөр), урьдчилан харах
- Агуулахын байршил газрын зураг дээр (Mapbox эсвэл түлхүүргүй OpenStreetMap)
- Гүйлгээ бүрийн 2% шимтгэл, нийлүүлэгчийн мөнгө татан авах урсгал
- Худалдан авалт баталгаажсан сэтгэгдэл, нийлүүлэгчийн үнэлгээ
- Мэдэгдэл: апп дотор + сонголтоор имэйл/SMS суваг
- Нүүр хуудасны сурталчилгааны баннер (админаас удирдана, CTR бүртгэнэ)

## Каталогийн импорт

barilga.mn-ийн нийтийн каталогийг татаж оруулах урсгалыг
[`backend/prisma/data/barilga/README.md`](./backend/prisma/data/barilga/README.md)
дотор бичсэн (scraper → зураг → `npm run db:import:barilga`).

## Тест

```bash
npm run test:backend   # 59 unit — гуравдагч үйлчилгээгүйгээр ажиллана
npm run test:e2e       # 25 e2e — PostgreSQL + seed шаардана
```

## Туршилтын бүртгэл

Нууц үг: `password123`

| Хаяг | Эрх |
|---|---|
| `admin@100ail.mn` | Админ |
| `buyer@100ail.mn` | Худалдан авагч |
| `montsement@100ail.mn` | Нийлүүлэгч |
