"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRICE_RANGE, type Offer, type Product } from "@/data/catalog";
import {
  buildProductQuery,
  toFilterGroups,
  toOffer,
  toProduct,
  type ApiProductList,
} from "@/lib/catalog-api";
import { useResource } from "@/lib/use-resource";
import { CartPanel } from "./cart-panel";
import { CatalogPanel } from "./catalog-panel";
import { ComparisonPanel } from "./comparison-panel";
import { FilterPanel, type PriceRange } from "./filter-panel";
import { PromoBanners } from "./promo-banners";
import { SiteHeader } from "./site-header";
import { useCart } from "./cart-context";

const PAGE_SIZE = 12;

const emptySelection = (): Record<string, Set<string>> => ({
  location: new Set<string>(),
  availability: new Set<string>(),
  supplier: new Set<string>(),
  manufacturer: new Set<string>(),
});

export function Storefront() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") ?? "",
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortId, setSortId] = useState("price");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selected, setSelected] =
    useState<Record<string, Set<string>>>(emptySelection);
  const [price, setPrice] = useState<PriceRange | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [compare, setCompare] = useState<Set<string>>(new Set());
  const { lines: cart, setQty, removeLine } = useCart();

  // Хайлтын мөр бичих бүрд хүсэлт явуулахгүй
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, debouncedQuery, sortId, selected, price]);

  /**
   * Гулсуурын хязгаар. Хариунаас ирсэн facet-аар шинэчлэгдэнэ — статик
   * тогтмолтой харьцуулж байсан тул 1 сая-аас дээш дээд хязгаар тавихад
   * шүүлт чимээгүй үл тоомсорлогдож байв.
   */
  const [bounds, setBounds] = useState(PRICE_RANGE);

  const path = useMemo(() => {
    const search = buildProductQuery({
      category: activeCategory || undefined,
      q: debouncedQuery,
      sort: sortId,
      page,
      limit: PAGE_SIZE,
      price: price ?? undefined,
      priceRange: bounds,
      selected,
    });
    // Хайлтын үг байвал Meilisearch/PostgreSQL хайлтын endpoint-оор дамжуулна
    return debouncedQuery.trim() ? `/search?${search}` : `/products?${search}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, debouncedQuery, page, price, selected, sortId]);

  const catalog = useResource<ApiProductList>(path);

  const products: Product[] = useMemo(
    () => (catalog.data?.items ?? []).map(toProduct),
    [catalog.data],
  );

  const offersByProduct: Record<string, Offer> = useMemo(() => {
    const map: Record<string, Offer> = {};
    for (const item of catalog.data?.items ?? []) {
      const best = item.bestOffer ?? item.offers[0];
      if (best) map[item.id] = toOffer(best);
    }
    return map;
  }, [catalog.data]);

  const facets = catalog.data?.facets;
  const filterGroups = useMemo(
    () => (facets ? toFilterGroups(facets) : []),
    [facets],
  );
  const facetPrice = facets?.price ?? bounds;

  // Facet-ийн хязгаар нь ангилал/хайлт солигдоход л өөрчлөгдөнө (үнийн
  // шүүлтээс хамаарахгүй) тул давтан татах эргэлт үүсэхгүй.
  useEffect(() => {
    const next = facets?.price;
    if (!next) return;
    setBounds((prev) =>
      prev.min === next.min && prev.max === next.max ? prev : next,
    );
  }, [facets?.price]);

  const toggleFilter = (groupId: string, optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[groupId] ?? []);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return { ...prev, [groupId]: next };
    });
  };

  const clearFilters = () => {
    setSelected(emptySelection());
    setPrice(null);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleCompare = (productId: string) => {
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader
        activeNav="home"
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="mx-auto max-w-[1660px] px-4 py-4 xl:px-6">
        <PromoBanners />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_268px_minmax(0,1fr)] xl:items-start">
          <div className="xl:col-start-1 xl:row-start-1">
            <CatalogPanel
              products={products}
              offers={offersByProduct}
              total={catalog.data?.total ?? 0}
              pages={catalog.data?.pages ?? 1}
              loading={catalog.loading}
              error={catalog.error}
              query={query}
              onQueryChange={setQuery}
              sortId={sortId}
              onSortChange={setSortId}
              view={view}
              onViewChange={setView}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              page={page}
              onPageChange={setPage}
            />
          </div>

          <div className="xl:col-start-2 xl:row-start-1">
            <FilterPanel
              groups={filterGroups}
              selected={selected}
              onToggle={toggleFilter}
              onClearAll={clearFilters}
              price={price ?? facetPrice}
              range={facetPrice}
              onPriceChange={setPrice}
              openGroups={openGroups}
              onToggleGroup={(groupId) =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [groupId]: !(prev[groupId] ?? true),
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-4 xl:col-start-3 xl:row-start-1">
            <CartPanel
              lines={cart}
              onQtyChange={setQty}
              onRemove={removeLine}
            />
            <ComparisonPanel
              products={products}
              offers={offersByProduct}
              selected={compare}
              onToggle={toggleCompare}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
