# BarilgaHUB

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
npm run db:push && npm run db:seed      # ангилал, нийлүүлэгч, хэрэглэгч
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

`db:seed` нь каталог үүсгэдэггүй — бодит бараа энэ импортоос ирнэ.
barilga.mn-ийн нийтийн каталогийг татаж оруулах урсгалыг
[`backend/prisma/data/barilga/README.md`](./backend/prisma/data/barilga/README.md)
дотор бичсэн (scraper → зураг → `npm run db:import:barilga`).

## Тест

```bash
npm run test:backend                  # 59 unit — гуравдагч үйлчилгээгүйгээр
npm run db:seed:demo && npm run test:e2e   # 25 e2e — демо каталог шаардана
```

## Туршилтын бүртгэл

Нууц үг: `password123`

| Хаяг | Эрх |
|---|---|
| `admin@barilgahub.mn` | Админ |
| `buyer@barilgahub.mn` | Худалдан авагч |
| `montsement@barilgahub.mn` | Нийлүүлэгч |

## Байршуулалт

- **Backend → Railway**: `.railway/railway.ts` (Docker + PostgreSQL, seed
  болон каталогийн импортыг deploy бүрд ажиллуулна)
- **Frontend → Vercel**: гурван тусдаа project, Root Directory нь
  `frontend/storefront`, `frontend/supplier`, `frontend/admin`;
  `NEXT_PUBLIC_API_URL`-ыг Railway-ийн хаягаар тавина
- Бүх зүйлийг нэг сервер дээр: `docker compose up -d --build`

### Railway дээр байршуулах

Тохиргоо нь `.railway/railway.ts` дотор кодоор бичигдсэн (сервис, сан,
диск, бүс, орчны хувьсагчид). Хэрэгжүүлэх:

```bash
brew install railway     # эсвэл: curl -fsSL https://railway.com/install.sh | sh
npm install              # `railway` SDK — тохиргоог уншихад хэрэгтэй
railway login            # хөтөч нээгдэнэ
railway link             # төслийг холбоно
npm run railway:plan     # ямар өөрчлөлт орохыг харуулна
npm run railway:apply    # баталгаажуулсны дараа хэрэгжүүлнэ
```

CLI-г `npx @railway/cli`-ээр дуудахаас зайлсхий: npm-ийн install-script
хориглосон тохиргоотой машин дээр хоёрдогч файл нь татагдахгүй, ажиллахгүй.
`brew` эсвэл дээрх суулгагч найдвартай.

Дараа нь Railway-ийн самбараас дараах хувьсагчдыг нэг удаа тохируулна
(тохиргоонд `preserve()` гэж тэмдэглэсэн тул дараагийн `apply` тэдгээрийг
дарж бичихгүй): `JWT_SECRET`, `CORS_ORIGINS`, `PUBLIC_API_URL`,
`PUBLIC_WEB_URL`, `S3_PUBLIC_URL`.

Анхаарах зүйлс:

- **Хуучин `railway.json`/`railway.toml` ашиглахгүй.** Railway-ийн
  «Config as Code» нь 2026-12-01-нд уншигдахаа болих бөгөөд шинэ сервис
  түүнийг ерөөсөө дэмжихгүй. `.railway/railway.ts` нь цорын ганц зам.
- **Бүс нь Сингапур** (`asia-southeast1`) — Монголд Франкфуртаас ойр.
  Сервис, PostgreSQL, диск гурав ижил бүсэд байх ёстой.
- **`PORT`-ыг Railway өөрөө оноодог**; `main.ts` нь түүнийг уншаад
  `0.0.0.0` дээр сонсдог (localhost дээр сонсвол хүсэлт хүрэхгүй).
- **`/app/media` дээр диск холбогдоно** — хэрэглэгчийн байршуулсан
  нэхэмжлэх, баримт deploy бүрд устахгүйн тулд. Барааны зураг энд
  ордоггүй: тэдгээр нь Vercel-ийн CDN-ээс өгөгддөг.
- **Идэвхгүй үед унтраахгүй** (`sleepApplication: false`) тул хүйтэн
  асалт байхгүй. Үүнээс гадна `docker-entrypoint.sh` нь `prisma db push`-ыг
  зөвхөн `schema.prisma` өөрчлөгдсөн үед ажиллуулдаг
  (`backend/prisma/sync-schema.ts` нь схемийн хэшийг `app_meta.schema_state`-д
  хадгална) — ингэснээр deploy болон дахин асалт 10-20 секундээр хурдан.

Дэлгэрэнгүйг архитектурын баримтын 12.8–12.9 хэсгээс уншина уу.
