# 100 Айл — Storefront

Барилгын материалын marketplace-ийн худалдан авагчийн веб (архитектурын
баримтын `apps/storefront`). Next.js App Router + TypeScript + Tailwind CSS v4.

## Ажиллуулах

```bash
npm install
npm run dev     # http://localhost:3100
npm run build   # production build
npm start       # build-ийг ажиллуулах
```

> Порт 3100 — 3000-г өөр төсөл эзэлсэн байсан тул. `package.json`-оос солино.

## Бүтэц

```text
src/
├── app/
│   ├── layout.tsx           # html/body, metadata, dark theme
│   ├── page.tsx             # нүүр (server component)
│   └── globals.css          # Tailwind + өнгө, slider, scrollbar
├── components/
│   ├── storefront.tsx       # бүх төлөвийг барих client root
│   ├── site-header.tsx      # лого, цэс, сагс, ангиллын мөр
│   ├── catalog-panel.tsx    # хайлт, эрэмбэлэлт, grid/list, хуудаслалт
│   ├── product-card.tsx     # барааны карт (grid ба list)
│   ├── filter-panel.tsx     # үнийн хүрээ + шүүлтүүрийн бүлгүүд
│   ├── cart-panel.tsx       # сагс, нийт дүн, итгэлцлийн мөр
│   ├── comparison-panel.tsx # нэг барааны олон offer-ийн харьцуулалт
│   ├── product-art.tsx      # барааны SVG дүрслэл (зургийн орлуулагч)
│   ├── icons.tsx            # line icon-ууд
│   └── ui.tsx               # Panel, Checkbox, Collapsible, IconButton
├── data/catalog.ts          # төрөл + mock өгөгдөл
└── lib/format.ts            # тоо, үнийн формат
```

## Өгөгдлийн загвар

Баримтын 7-р хэсгийн дагуу `Product` (материалын тодорхойлолт) ба `Offer`
(нийлүүлэгч бүрийн үнэ, үлдэгдэл, агуулах, хүргэлт) тусад нь загварчлагдсан.
Каталогийн карт нь бүтээгдэхүүн бүрийн хамгийн боломжийн offer-ийг харуулж,
"Харьцуулах бүтээгдэхүүн" хэсэг нь нэг product-ын олон offer-ийг зэрэгцүүлнэ.

## Ажилладаг зүйлс

- Нэрээр хайх, үнэ / эрэлт / нэрээр эрэмбэлэх
- Үнийн хос slider, байршлын шүүлтүүр (агуулах + хүргэдэг хот)
- Grid / list харагдац, favourite тэмдэглэх
- Сагсны тоо хэмжээ, мөр устгах, нийт дүн шууд тооцоолол
- Харьцуулалтад offer сонгох (2-оос дээш сонгоход товч идэвхжинэ)

## Дараагийн алхам

Одоогоор өгөгдөл нь `src/data/catalog.ts` доторх mock. NestJS API холбогдох үед
энэ файлыг `/products`, `/offers`, `/carts` endpoint-ээр солино. Барааны SVG
дүрслэлийг S3 дээрх бодит зургаар (`next/image`) солино.
