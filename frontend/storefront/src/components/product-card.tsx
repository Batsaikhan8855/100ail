"use client";

import { useState } from "react";
import Link from "next/link";
import type { Offer, Product } from "@/data/catalog";
import { formatNumber, formatPrice } from "@/lib/format";
import { useCart } from "./cart-context";
import { BoxIcon, CartIcon, CheckIcon, HeartIcon, PinIcon } from "./icons";
import { ProductThumb } from "./product-art";

/**
 * Каталогоос шууд сагслах товч.
 *
 * Карт бүхэлдээ дэлгэрэнгүй хуудас руу чиглэсэн холбоос тул навигацыг
 * зогсоож, хамгийн хямд саналаас 1 нэгжийг сагсанд нэмнэ. Тоо хэмжээ,
 * өөр нийлүүлэгч сонгох бол дэлгэрэнгүй хуудсаар орно.
 */
function AddToCartButton({
  offer,
  size,
}: {
  offer: Offer;
  size: "grid" | "list";
}) {
  const { addLine } = useCart();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const soldOut = offer.stock <= 0;

  const add = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (soldOut || state !== "idle") return;
    setState("busy");
    try {
      await addLine(offer.id, 1);
      setState("done");
      window.setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("idle");
    }
  };

  const label = soldOut
    ? "Дууссан"
    : state === "done"
      ? "Нэмэгдлээ"
      : state === "busy"
        ? "Нэмж байна…"
        : "Сагслах";

  return (
    <button
      type="button"
      onClick={add}
      disabled={soldOut || state !== "idle"}
      aria-label={`${offer.supplier.name} — сагсанд нэмэх`}
      className={`flex items-center justify-center gap-1.5 rounded font-semibold transition-colors ${
        size === "grid"
          ? "mt-2.5 h-9 w-full text-[12.5px]"
          : "h-9 px-3.5 text-[12.5px]"
      } ${
        soldOut
          ? "cursor-not-allowed bg-ink-700/60 text-mute-dim"
          : state === "done"
            ? "bg-ok/15 text-ok"
            : "bg-brand/12 text-brand hover:bg-brand hover:text-on-brand"
      }`}
    >
      {state === "done" ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CartIcon className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function StockBadges({ offer }: { offer: Offer }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
      <span className="flex items-center gap-1.5 text-mute-dim">
        <BoxIcon className="h-3.5 w-3.5 text-ok" />
        Бэлэн
        <span className="text-mute">
          {formatNumber(offer.stock)} {offer.unit}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-mute-dim">
        <PinIcon className="h-3.5 w-3.5 text-brand" />
        {offer.location}
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  offer,
  favorite,
  onToggleFavorite,
  view,
}: {
  product: Product;
  offer: Offer;
  favorite: boolean;
  onToggleFavorite: () => void;
  view: "grid" | "list";
}) {
  const href = `/product/${product.slug}`;
  // Карт бүхэлдээ холбоос тул зүрхэн товч навигацыг зогсооно
  const handleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    onToggleFavorite();
  };

  const favButton = (
    <button
      type="button"
      onClick={handleFavorite}
      aria-label={favorite ? "Хадгалснаас хасах" : "Хадгалах"}
      aria-pressed={favorite}
      className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/60 backdrop-blur transition-colors ${
        favorite ? "text-brand" : "text-mute hover:text-fg"
      }`}
    >
      <HeartIcon
        className="h-[18px] w-[18px]"
        fill={favorite ? "currentColor" : "none"}
      />
    </button>
  );

  if (view === "list") {
    return (
      <Link href={href} className="block">
        <article className="flex gap-4 rounded-md border border-ink-700 bg-ink-800 p-3 transition-colors hover:border-ink-600">
          <div className="relative h-[104px] w-[140px] shrink-0 overflow-hidden rounded bg-gradient-to-b from-ink-700/60 to-ink-900">
            <ProductThumb
              image={product.image}
              art={product.art}
              name={product.name}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-fg">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate text-[11.5px] text-mute">
              {offer.supplier.name}
            </p>
            <StockBadges offer={offer} />
          </div>
          <div className="flex shrink-0 flex-col items-end justify-between">
            <button
              type="button"
              onClick={handleFavorite}
              aria-label={favorite ? "Хадгалснаас хасах" : "Хадгалах"}
              aria-pressed={favorite}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                favorite ? "text-brand" : "text-mute hover:text-fg"
              }`}
            >
              <HeartIcon
                className="h-[18px] w-[18px]"
                fill={favorite ? "currentColor" : "none"}
              />
            </button>
            <div className="flex flex-col items-end gap-2">
              <p className="text-lg font-bold text-brand">
                {formatPrice(offer.price)}
              </p>
              <AddToCartButton offer={offer} size="list" />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={href} className="block">
      <article className="group overflow-hidden rounded-md border border-ink-700 bg-ink-800 transition-colors hover:border-ink-600">
        <div className="relative h-[168px] bg-gradient-to-b from-ink-700/50 to-ink-900 p-3">
          <ProductThumb
            image={product.image}
            art={product.art}
            name={product.name}
          />
          {favButton}
        </div>
        <div className="border-t border-ink-700 p-3">
          <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-tight text-fg">
            {product.name}
          </h3>
          <p className="mt-0.5 truncate text-[11.5px] text-mute">
            {offer.supplier.name}
          </p>
          <p className="mt-2 text-[19px] font-bold leading-none text-brand">
            {formatPrice(offer.price)}
          </p>
          <StockBadges offer={offer} />
          <AddToCartButton offer={offer} size="grid" />
        </div>
      </article>
    </Link>
  );
}
