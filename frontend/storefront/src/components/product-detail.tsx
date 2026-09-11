"use client";

import { useState } from "react";
import {
  TRUST_ITEMS,
  type Offer,
  type Product,
  type ProductDetail as ProductDetailData,
  type Review,
} from "@/data/catalog";
import { formatNumber, formatPrice } from "@/lib/format";
import {
  BoxIcon,
  CartIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  HeartIcon,
  MinusIcon,
  PinIcon,
  PlusIcon,
  StarIcon,
  TRUST_ICONS,
  TruckIcon,
  WarehouseIcon,
} from "./icons";
import { useCart } from "./cart-context";
import { useFavorites } from "./favorites-context";
import { MapView, mapsLink } from "./map";
import { OfferList, Rating, VerifiedBadge } from "./offer-list";
import { ReviewForm } from "./review-form";
import { ProductArt } from "./product-art";
import { SiteHeader } from "./site-header";
import { Panel, PanelHeader } from "./ui";

type TabId = "spec" | "usage" | "reviews";

export function ProductDetail({
  product,
  offers,
  reviews,
  detail,
  categoryName,
  images = [],
}: {
  product: Product;
  /** Хямдаас нь эрэмбэлэгдсэн нийлүүлэгчийн саналууд */
  offers: Offer[];
  reviews: Review[];
  detail: ProductDetailData | null;
  categoryName: string;
  /** S3-д байршуулсан зургууд; байхгүй бол вектор зураглал харагдана */
  images?: { id: string; url: string }[];
}) {
  const [activeCategory, setActiveCategory] = useState(product.categoryId);
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabId>("spec");
  // Зүрх нь каталогтой нэг эх сурвалжтай — серверт хадгалагдана
  const { has: isFavorite, toggle: toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const [added, setAdded] = useState(false);
  /** Галерейд сонгогдсон зураг (олон зурагтай бараанд) */
  const [imageIndex, setImageIndex] = useState(0);
  const { addLine } = useCart();

  const offer = offers.find((o) => o.id === offerId) ?? offers[0];

  // Идэвхтэй саналгүй бол зөвхөн мэдээллийг харуулна
  if (!offer) {
    return (
      <div className="min-h-screen bg-ink-950">
        <SiteHeader activeNav="home" />
        <main className="mx-auto max-w-[820px] px-4 py-16 text-center">
          <h1 className="text-[20px] font-bold text-fg">{product.name}</h1>
          <p className="mt-2 text-[13.5px] text-mute">
            Энэ бүтээгдэхүүнд одоогоор идэвхтэй санал алга байна.
          </p>
        </main>
      </div>
    );
  }

  // Бөөний үнэ нь зөвхөн доод тоо хэмжээнээс дээш захиалгад хүчинтэй
  const bulkActive =
    Boolean(offer.bulkPrice) && qty >= (offer.bulkMinQty ?? Infinity);
  const unitPrice = bulkActive ? (offer.bulkPrice as number) : offer.price;
  const goodsTotal = unitPrice * qty;
  const deliveryPrice = offer.deliveryPrice ?? 0;
  const total = goodsTotal + deliveryPrice;

  const setQuantity = (value: number) => {
    if (!Number.isFinite(value)) return;
    setQty(Math.min(Math.max(1, Math.round(value)), offer.stock));
    setAdded(false);
  };

  const selectOffer = (id: string) => {
    setOfferId(id);
    setAdded(false);
  };

  const addToCart = async () => {
    // Сагс серверт хадгалагдана: нөөцлөлт, үнэ, шимтгэлийг API талд бодно
    await addLine(offer.id, qty);
    setAdded(true);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "spec", label: "Техникийн үзүүлэлт" },
    { id: "usage", label: "Хэрэглээ" },
    { id: "reviews", label: `Сэтгэгдэл (${reviews.length})` },
  ];

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader
        activeNav="products"
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="mx-auto max-w-[1660px] px-4 py-4 xl:px-6">
        <nav
          aria-label="Замын мөр"
          className="flex flex-wrap items-center gap-1.5 pb-3.5 text-[12.5px] text-mute"
        >
          <a href="/" className="transition-colors hover:text-fg">
            Нүүр
          </a>
          <ChevronRightIcon className="h-3.5 w-3.5 text-mute-dim" />
          <a href="/" className="transition-colors hover:text-fg">
            {categoryName || "Бүтээгдэхүүн"}
          </a>
          <ChevronRightIcon className="h-3.5 w-3.5 text-mute-dim" />
          <span className="text-fg">{product.name}</span>
        </nav>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="flex flex-col gap-4">
            <Panel className="p-4">
              <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="flex flex-col gap-2">
                  <div className="relative h-[260px] overflow-hidden rounded-md bg-gradient-to-b from-ink-700/50 to-ink-900 p-4">
                    {images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(images[imageIndex] ?? images[0]).url}
                        alt={product.name}
                        className="h-full w-full rounded object-contain"
                      />
                    ) : (
                      <ProductArt art={product.art} />
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(product.id)}
                      aria-label={favorite ? "Хадгалснаас хасах" : "Хадгалах"}
                      aria-pressed={favorite}
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/60 backdrop-blur transition-colors ${
                        favorite
                          ? "text-brand"
                          : "text-mute hover:text-fg"
                      }`}
                    >
                      <HeartIcon
                        className="h-5 w-5"
                        fill={favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {/* Хоёроос дээш зурагтай бараанд сонгох зурвас */}
                  {images.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setImageIndex(index)}
                          aria-label={`${index + 1}-р зураг`}
                          aria-current={index === imageIndex}
                          className={`h-14 w-14 shrink-0 overflow-hidden rounded border bg-ink-900 p-1 transition-colors ${
                            index === imageIndex
                              ? "border-brand"
                              : "border-ink-700 hover:border-ink-600"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] font-bold leading-tight text-fg">
                    {product.name}
                    {product.variant ? (
                      <span className="text-mute"> {product.variant}</span>
                    ) : null}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Rating value={offer.rating} count={offer.reviewCount} />
                    <span className="text-[12.5px] text-mute">
                      {offers.length} нийлүүлэгчийн санал
                    </span>
                    {detail?.standard ? (
                      <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[11px] text-mute">
                        {detail.standard}
                      </span>
                    ) : null}
                  </div>

                  {detail?.summary ? (
                    <p className="mt-3.5 text-[13.5px] leading-relaxed text-mute">
                      {detail.summary}
                    </p>
                  ) : null}

                  <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    <Fact
                      icon={<BoxIcon className="h-4 w-4 text-ok" />}
                      label="Бэлэн байгаа"
                      value={`${formatNumber(offer.stock)} ${offer.unit}`}
                    />
                    <Fact
                      icon={<WarehouseIcon className="h-4 w-4 text-mute" />}
                      label="Агуулах"
                      value={offer.location}
                    />
                    <Fact
                      icon={<TruckIcon className="h-4 w-4 text-mute" />}
                      label="Хүргэлт"
                      value={
                        deliveryPrice === 0
                          ? "Үнэгүй"
                          : formatPrice(deliveryPrice)
                      }
                    />
                    <Fact
                      icon={<ClockIcon className="h-4 w-4 text-mute" />}
                      label="Хүргэх хугацаа"
                      value={
                        offer.deliveryDays
                          ? `${offer.deliveryDays} хоног`
                          : "Тохиролцоно"
                      }
                    />
                  </dl>
                </div>
              </div>
            </Panel>

            <OfferList
              offers={offers}
              selectedId={offer.id}
              onSelect={selectOffer}
            />

            <Panel>
              <div className="flex gap-1 overflow-x-auto border-b border-ink-700 px-4">
                {tabs.map((item) => {
                  const active = item.id === tab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      aria-current={active ? "true" : undefined}
                      className={`relative shrink-0 px-3.5 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                        active
                          ? "text-brand"
                          : "text-mute hover:text-fg"
                      }`}
                    >
                      {item.label}
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="p-4">
                {tab === "spec" ? (
                  <dl className="grid gap-x-8 sm:grid-cols-2">
                    {(detail?.attributes ?? []).map((attribute) => (
                      <div
                        key={attribute.label}
                        className="flex items-baseline justify-between gap-4 border-b border-ink-700 py-2.5 last:border-b-0"
                      >
                        <dt className="text-[12.5px] text-mute">
                          {attribute.label}
                        </dt>
                        <dd className="text-right text-[13px] font-medium text-fg">
                          {attribute.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {tab === "usage" ? (
                  <ul className="flex flex-col gap-2.5">
                    {(detail?.usage ?? []).map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2.5 text-[13.5px] text-mute"
                      >
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {tab === "reviews" ? (
                  <>
                    {reviews.length === 0 ? (
                      <p className="py-8 text-center text-sm text-mute">
                        Одоогоор сэтгэгдэл алга байна.
                      </p>
                    ) : (
                      <ul className="divide-y divide-ink-700">
                        {reviews.map((review) => (
                          <li key={review.id} className="py-3.5 first:pt-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-[13px] font-semibold text-fg">
                                {review.author}
                              </span>
                              <span className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <StarIcon
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < review.rating
                                        ? "text-brand"
                                        : "text-ink-600"
                                    }`}
                                    fill="currentColor"
                                  />
                                ))}
                              </span>
                              <span className="text-[11.5px] text-mute-dim">
                                {review.supplierName} · {review.date}
                              </span>
                              {review.verified ? (
                                <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-[2px] text-[10.5px] text-ok">
                                  Худалдан авалт баталгаажсан
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-mute">
                              {review.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <ReviewForm slug={product.slug} />
                  </>
                ) : null}
              </div>
            </Panel>
          </div>

          <div className="flex flex-col gap-4 xl:sticky xl:top-[152px]">
            <Panel>
              <PanelHeader title="Захиалга" meta={offer.supplier.name} />

              <div className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  {offer.supplier.verified ? <VerifiedBadge /> : null}
                  <Rating value={offer.rating} count={offer.reviewCount} />
                </div>

                <p className="mt-3 text-[28px] font-bold leading-none text-brand">
                  {formatPrice(unitPrice)}
                  <span className="ml-1.5 text-[13px] font-medium text-mute">
                    / {offer.unit}
                  </span>
                </p>

                {offer.bulkPrice && offer.bulkMinQty ? (
                  <p className="mt-2 text-[12px] text-mute">
                    {bulkActive ? (
                      <span className="text-ok">
                        Бөөний үнэ идэвхжсэн ({formatNumber(offer.bulkMinQty)}{" "}
                        {offer.unit}-с дээш)
                      </span>
                    ) : (
                      <>
                        {formatNumber(offer.bulkMinQty)} {offer.unit}-с дээш
                        авбал{" "}
                        <span className="font-semibold text-fg">
                          {formatPrice(offer.bulkPrice)}
                        </span>
                      </>
                    )}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-md border border-ink-700 bg-ink-900">
                    <button
                      type="button"
                      aria-label="Тоо хэмжээ хасах"
                      onClick={() => setQuantity(qty - 1)}
                      className="flex h-10 w-10 items-center justify-center text-mute transition-colors hover:text-fg"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={qty}
                      min={1}
                      max={offer.stock}
                      aria-label="Тоо хэмжээ"
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="h-10 w-16 border-x border-ink-700 bg-transparent text-center text-[14px] font-semibold text-fg outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Тоо хэмжээ нэмэх"
                      onClick={() => setQuantity(qty + 1)}
                      className="flex h-10 w-10 items-center justify-center text-mute transition-colors hover:text-fg"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-[12px] text-mute">
                    Үлдэгдэл {formatNumber(offer.stock)} {offer.unit}
                  </span>
                </div>

                <dl className="mt-4 flex flex-col gap-2 border-t border-ink-700 pt-3.5 text-[13px]">
                  <Row label="Барааны дүн" value={formatPrice(goodsTotal)} />
                  <Row
                    label="Хүргэлт"
                    value={
                      deliveryPrice === 0
                        ? "Үнэгүй"
                        : formatPrice(deliveryPrice)
                    }
                  />
                  <div className="mt-1 flex items-baseline justify-between border-t border-ink-700 pt-3">
                    <dt className="text-[13px] text-mute">Нийт дүн:</dt>
                    <dd className="text-[22px] font-bold text-brand">
                      {formatPrice(total)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={addToCart}
                  className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-md bg-brand px-4 py-3.5 text-[14px] font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hi"
                >
                  {added ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <CartIcon className="h-5 w-5" />
                  )}
                  {added ? "Сагсанд нэмэгдлээ" : "Сагсанд нэмэх"}
                </button>

                <button
                  type="button"
                  className="mt-2 w-full rounded-md border border-ink-600 px-4 py-3 text-[13px] font-semibold text-mute transition-colors hover:border-brand hover:text-brand"
                >
                  Шууд захиалах
                </button>

                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-mute-dim">
                  <PinIcon className="h-3.5 w-3.5" />
                  {offer.location} агуулахаас {offer.deliveryNote.toLowerCase()}
                </p>
              </div>
            </Panel>

            <WarehouseMapPanel offer={offer} />

            <Panel className="px-4 py-3.5">
              <ul className="flex flex-col gap-3.5">
                {TRUST_ITEMS.map((item) => {
                  const Icon = TRUST_ICONS[item.icon];
                  return (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <Icon className="h-[22px] w-[22px] shrink-0 text-mute" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-fg">
                          {item.title}
                        </span>
                        <span className="block truncate text-[11px] text-mute-dim">
                          {item.note}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <dt className="text-[11px] text-mute-dim">{label}</dt>
        <dd className="truncate text-[13px] font-medium text-fg">{value}</dd>
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-mute">{label}</dt>
      <dd className="font-medium text-fg">{value}</dd>
    </div>
  );
}

/**
 * Сонгосон нийлүүлэгчийн агуулахын байршил. Координат тэмдэглэсэн
 * агуулах байхгүй бол хэсэг харагдахгүй (баримтын 2-р хэсэг).
 */
function WarehouseMapPanel({ offer }: { offer: Offer }) {
  const located = (offer.warehouses ?? []).filter(
    (warehouse) => warehouse.lat !== null && warehouse.lng !== null,
  );
  if (located.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title="Агуулахын байршил"
        meta={`${located.length} салбар`}
      />
      <div className="p-4">
        <MapView
          points={located.map((warehouse) => ({
            lat: warehouse.lat as number,
            lng: warehouse.lng as number,
            label: warehouse.name,
          }))}
          height={190}
        />
        <ul className="mt-3 flex flex-col gap-2">
          {located.map((warehouse) => (
            <li
              key={warehouse.id}
              className="flex items-start justify-between gap-3 text-[12.5px]"
            >
              <span className="min-w-0">
                <a
                  href={mapsLink({
                    lat: warehouse.lat as number,
                    lng: warehouse.lng as number,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-fg hover:text-brand"
                >
                  {warehouse.name}
                </a>
                <span className="block truncate text-[11.5px] text-mute-dim">
                  {warehouse.address ?? warehouse.city}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-mute">
                {formatNumber(warehouse.quantity)} {offer.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
