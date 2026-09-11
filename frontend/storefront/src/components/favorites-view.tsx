"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Offer, Product } from "@/data/catalog";
import { toOffer, toProduct, type ApiProduct } from "@/lib/catalog-api";
import { apiGet } from "@/lib/api";
import { useFavorites } from "./favorites-context";
import { HeartIcon } from "./icons";
import { ProductCard } from "./product-card";
import { SiteHeader } from "./site-header";
import { Panel, PanelHeader } from "./ui";

/**
 * Хадгалсан барааны жагсаалт.
 *
 * Каталогтой ижил карт ашиглана — тэндээс шууд сагслах, дэлгэрэнгүй
 * рүү орох боломж хэвээр байна. Жагсаалт нь серверээс ирдэг тул
 * зүрхэлсэн бараа хуудас шинэчлэхэд ч, дараа орж ирэхэд ч үлдэнэ.
 */
export function FavoritesView() {
  const { ids, count, toggle, clear } = useFavorites();
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Зүрх дарах бүрд серверээс дахин татахгүй — жагсаалт ачаалахдаа л
  // бүтэн барааг авч, дараа нь орон нутагт шүүнэ
  useEffect(() => {
    let cancelled = false;
    apiGet<{ items: ApiProduct[] }>("/favorites")
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(
    () => items.filter((item) => ids.has(item.id)),
    [items, ids],
  );

  const offers = useMemo(() => {
    const map: Record<string, Offer> = {};
    for (const item of shown) {
      const best = item.bestOffer ?? item.offers[0];
      if (best) map[item.id] = toOffer(best);
    }
    return map;
  }, [shown]);

  const products: Product[] = useMemo(() => shown.map(toProduct), [shown]);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="" />

      <main className="mx-auto max-w-[1100px] px-4 py-6 xl:px-6">
        <Panel>
          <PanelHeader
            title="Хадгалсан бараа"
            meta={count > 0 ? `${count} бараа` : undefined}
            action={
              count > 0 ? (
                <button
                  type="button"
                  onClick={() => void clear()}
                  className="shrink-0 text-xs text-mute underline-offset-2 transition-colors hover:text-brand hover:underline"
                >
                  Бүгдийг арилгах
                </button>
              ) : undefined
            }
          />

          {loading ? (
            <p className="px-4 py-16 text-center text-sm text-mute">
              Ачаалж байна…
            </p>
          ) : products.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <HeartIcon className="mx-auto h-8 w-8 text-ink-600" />
              <p className="mt-3 text-sm text-mute">
                Хадгалсан бараа алга байна.
              </p>
              <p className="mt-1 text-[12.5px] text-mute-dim">
                Каталогаас барааны зүрх дээр дарж хадгална.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-md bg-brand px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hi"
              >
                Каталог руу
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const offer = offers[product.id];
                if (!offer) return null;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    offer={offer}
                    view="grid"
                    favorite
                    onToggleFavorite={() => void toggle(product.id)}
                  />
                );
              })}
            </div>
          )}
        </Panel>
      </main>
    </div>
  );
}
