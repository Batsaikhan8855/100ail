"use client";

import { useEffect, useRef, useState } from "react";
import type { Offer, Product } from "@/data/catalog";
import { SORT_OPTIONS } from "@/data/catalog";
import { formatNumber } from "@/lib/format";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  SortIcon,
} from "./icons";
import { ProductCard } from "./product-card";
import { IconButton, Panel, PanelHeader } from "./ui";

/** Идэвхтэй хуудсыг тойрсон дугаарлалт */
const pageNumbers = (page: number, pages: number): number[] => {
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const list: number[] = [];
  for (let index = start; index <= end; index += 1) list.push(index);
  return list;
};

export function CatalogPanel({
  products,
  offers,
  total,
  pages,
  loading,
  error,
  query,
  onQueryChange,
  sortId,
  onSortChange,
  view,
  onViewChange,
  favorites,
  onToggleFavorite,
  page,
  onPageChange,
}: {
  products: Product[];
  offers: Record<string, Offer>;
  /** API-аас ирсэн нийт тоо ба хуудасны тоо */
  total: number;
  pages: number;
  loading: boolean;
  error: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  sortId: string;
  onSortChange: (id: string) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  favorites: Set<string>;
  onToggleFavorite: (productId: string) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Барилгын материал"
        meta={`${formatNumber(total)} бүтээгдэхүүн`}
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-4 py-3.5">
        <label className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-3 py-2.5 focus-within:border-ink-600">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-mute-dim" />
          <span className="sr-only">Бүтээгдэхүүн хайх</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Бүтээгдэхүүн хайх..."
            className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-mute-dim"
          />
        </label>

        <SortDropdown value={sortId} onChange={onSortChange} />

        <div className="flex items-center gap-2">
          <IconButton
            label="Сүлжээ харагдац"
            active={view === "grid"}
            onClick={() => onViewChange("grid")}
          >
            <GridIcon className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton
            label="Жагсаалт харагдац"
            active={view === "list"}
            onClick={() => onViewChange("list")}
          >
            <ListIcon className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <p className="py-16 text-center text-sm text-[#f08585]">{error}</p>
        ) : loading && products.length === 0 ? (
          <p className="py-16 text-center text-sm text-mute">Ачаалж байна…</p>
        ) : products.length === 0 ? (
          <p className="py-16 text-center text-sm text-mute">
            Хайлтад тохирох бүтээгдэхүүн олдсонгүй.
          </p>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {products.map((product) => {
              const offer = offers[product.id];
              if (!offer) return null;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  offer={offer}
                  view={view}
                  favorite={favorites.has(product.id)}
                  onToggleFavorite={() => onToggleFavorite(product.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <nav
        aria-label="Хуудаслалт"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 px-4 py-3.5"
      >
        <div className="flex items-center gap-1.5">
          {pageNumbers(page, pages).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={`h-9 w-9 rounded-md text-[13px] font-semibold transition-colors ${
                n === page
                  ? "bg-brand text-ink-950"
                  : "border border-ink-700 bg-ink-900 text-[#c2c7cf] hover:border-ink-600 hover:text-white"
              }`}
            >
              {n}
            </button>
          ))}
          {pages > 5 && page < pages - 2 ? (
            <span aria-hidden className="px-1.5 text-mute-dim">
              ···
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Дараагийн хуудас"
            disabled={page >= pages}
            onClick={() => onPageChange(Math.min(page + 1, pages))}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-700 bg-ink-900 text-[#c2c7cf] transition-colors hover:border-ink-600 hover:text-white"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-mute">
          Нийт {formatNumber(total)} бүтээгдэхүүн · {page}/{pages} хуудас
        </p>
      </nav>
    </Panel>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-[#c2c7cf] transition-colors hover:text-white"
      >
        <SortIcon className="h-[18px] w-[18px] text-mute" />
        {current.label}
        <ChevronDownIcon
          className={`h-4 w-4 text-mute transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-md border border-ink-700 bg-ink-800 py-1 shadow-xl shadow-black/40"
        >
          {SORT_OPTIONS.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={option.id === value}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`block w-full px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-ink-700 ${
                  option.id === value ? "text-brand" : "text-[#c2c7cf]"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
