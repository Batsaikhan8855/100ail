"use client";

import Link from "next/link";
import type { Offer, Product } from "@/data/catalog";
import { formatNumber, formatPrice } from "@/lib/format";
import { BoxIcon, CheckIcon, PinIcon, TruckIcon } from "./icons";
import { ProductArt } from "./product-art";
import { Panel, PanelHeader } from "./ui";

/**
 * Каталогоос сонгосон бүтээгдэхүүнүүдийг хамгийн боломжийн саналаар нь
 * зэрэгцүүлэн харуулна (архитектурын баримтын 4.1, 7-р хэсэг).
 */
export function ComparisonPanel({
  products,
  offers,
  selected,
  onToggle,
}: {
  products: Product[];
  offers: Record<string, Offer>;
  selected: Set<string>;
  onToggle: (productId: string) => void;
}) {
  const chosen = products.filter((product) => selected.has(product.id));
  // Сонголт хийгээгүй үед каталогийн эхний бүтээгдэхүүнүүдийг санал болгоно
  const shown = (chosen.length > 0 ? chosen : products.slice(0, 4)).slice(0, 4);
  const cheapest = chosen
    .map((product) => offers[product.id])
    .filter(Boolean)
    .sort((a, b) => a.price - b.price)[0];

  return (
    <Panel>
      <PanelHeader
        title="Харьцуулах бүтээгдэхүүн"
        meta={
          chosen.length > 0
            ? `${chosen.length} сонгосон`
            : `${shown.length} бүтээгдэхүүн`
        }
      />

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-mute">
          Харьцуулах бүтээгдэхүүн алга.
        </p>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((product) => {
            const offer = offers[product.id];
            if (!offer) return null;
            const checked = selected.has(product.id);

            return (
              <article
                key={product.id}
                className={`overflow-hidden rounded-md border bg-ink-800 transition-colors ${
                  checked ? "border-brand" : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <div className="relative h-[132px] bg-gradient-to-b from-ink-700/50 to-ink-900 p-2">
                  <ProductArt art={product.art} />
                  <label className="absolute left-2.5 top-2.5 flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(product.id)}
                      aria-label={`${product.name}-ийг харьцуулалтад нэмэх`}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className="flex h-[15px] w-[15px] items-center justify-center rounded-[3px] border border-ink-600 bg-ink-950/80 transition-colors peer-checked:border-brand peer-checked:bg-brand"
                    >
                      <CheckIcon
                        className={`h-2.5 w-2.5 text-ink-950 ${
                          checked ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </span>
                  </label>
                </div>

                <div className="border-t border-ink-700 p-3">
                  <h3 className="text-[12px] font-semibold leading-tight text-white">
                    <Link
                      href={`/product/${product.slug}`}
                      className="transition-colors hover:text-brand"
                    >
                      {[product.name, product.variant].filter(Boolean).join(" ")}
                    </Link>
                  </h3>
                  <p className="mt-0.5 truncate text-[11.5px] text-mute">
                    {offer.supplier.name}
                  </p>
                  <p className="mt-2 text-[18px] font-bold leading-none text-brand">
                    {formatPrice(offer.price)}
                    {cheapest && offer.id === cheapest.id && chosen.length > 1 ? (
                      <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase text-ok">
                        хямд
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#9aa1ab]">
                    <BoxIcon className="h-3.5 w-3.5 text-ok" />
                    Бэлэн
                    <span className="text-[#c6ccd4]">
                      {formatNumber(offer.stock)} {offer.unit}
                    </span>
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#9aa1ab]">
                    <PinIcon className="h-3.5 w-3.5 text-brand" />
                    {offer.location}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-brand">
                    <TruckIcon className="h-3.5 w-3.5" />
                    {offer.deliveryNote}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
