"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/data/catalog";
import { toCategory, type ApiCategory } from "@/lib/catalog-api";
import { formatNumber } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { useCart } from "./cart-context";
import { NotificationBell } from "./notification-menu";
import { useSession } from "./session";
import {
  CATEGORY_ICONS,
  CartIcon,
  ChevronDownIcon,
  LogoMark,
  UserIcon,
} from "./icons";

export function SiteHeader({
  activeNav,
  activeCategory = "",
  onCategoryChange,
}: {
  activeNav: string;
  /** Ангиллын мөр зөвхөн каталогтой хуудсанд идэвхтэй байна */
  activeCategory?: string;
  onCategoryChange?: (id: string) => void;
}) {
  const { count: cartCount } = useCart();
  const { user, logout } = useSession();
  const categories = useResource<ApiCategory[]>("/categories");
  /** Дэд ангиллын мөр нээлттэй байгаа үндсэн ангилал */
  const [openCategory, setOpenCategory] = useState("");

  const rows = categories.data ?? [];
  // Дэд ангилал нь зөвхөн каталогийн хуудсанд утгатай (шүүлтүүр солино)
  const openRow = onCategoryChange
    ? rows.find((row) => row.slug === openCategory && row.children.length > 0)
    : undefined;
  // Зураггүй дэд ангилалд эцэг ангиллын вектор дүрсийг харуулна
  const OpenIcon = openRow ? CATEGORY_ICONS[toCategory(openRow).icon] : null;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1660px] items-center gap-6 px-4 xl:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark className="text-brand" />
          <span className="leading-none">
            <span className="block text-[26px] font-extrabold tracking-tight text-white">
              100 АЙЛ
            </span>
            <span className="mt-1 block text-[8.5px] font-medium uppercase tracking-[0.14em] text-mute-dim">
              Барилгын материалын маркетплейс
            </span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = link.id === activeNav;
            return (
              <Link
                key={link.id}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3.5 py-6 text-[13px] font-semibold uppercase tracking-wide transition-colors ${
                  active ? "text-brand" : "text-[#c2c7cf] hover:text-white"
                }`}
              >
                {link.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-4 h-0.5 rounded-full bg-brand"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 lg:ml-0 lg:gap-5">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-[#c2c7cf] transition-colors hover:text-white"
            aria-label={`Сагс, ${cartCount} бараа`}
          >
            <CartIcon className="h-6 w-6" />
            {cartCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink-950">
                {cartCount}
              </span>
            ) : null}
          </Link>

          <span aria-hidden className="hidden h-6 w-px bg-ink-700 sm:block" />

          {user ? <NotificationBell /> : null}

          {user ? (
            <>
              <Link
                href="/account/orders"
                className="hidden items-center gap-2 text-[13px] font-semibold text-[#c2c7cf] transition-colors hover:text-white sm:flex"
              >
                <UserIcon className="h-5 w-5" />
                {user.name}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-ink-600 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-[#c2c7cf] transition-colors hover:text-white"
              >
                Гарах
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[#c2c7cf] transition-colors hover:text-white sm:flex"
              >
                <UserIcon className="h-5 w-5" />
                Нэвтрэх
              </Link>
              <Link
                href="/login?mode=register"
                className="rounded-md bg-brand px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi"
              >
                Бүртгүүлэх
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-ink-700 bg-ink-900">
        <div className="mx-auto flex max-w-[1660px] items-stretch gap-1 overflow-x-auto px-4 xl:px-6">
          {rows.map((row) => {
            const category = toCategory(row);
            const Icon = CATEGORY_ICONS[category.icon];
            // Дэд ангилал сонгосон үед эцэг ангилал нь идэвхтэй харагдана
            const active =
              category.id === activeCategory ||
              row.children.some((child) => child.slug === activeCategory);
            const expandable =
              Boolean(onCategoryChange) && row.children.length > 0;
            const expanded = openCategory === row.slug;
            const content = (
              <>
                <Icon className="h-[22px] w-[22px]" />
                {category.name}
                {expandable ? (
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                ) : null}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-brand"
                  />
                ) : null}
              </>
            );
            const className = `relative flex shrink-0 items-center gap-2.5 px-4 py-3.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              active ? "text-brand" : "text-[#aeb4bd] hover:text-white"
            }`;

            // Каталогийн хуудсанд шүүлтүүр солино, бусад хуудсанд нүүр рүү шилжинэ
            return onCategoryChange ? (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  // Дарахад тухайн ангиллаар шүүж, дэд ангиллын мөр нээгдэнэ
                  const closing = active && expanded;
                  setOpenCategory(expandable && !closing ? row.slug : "");
                  onCategoryChange(closing ? "" : category.id);
                }}
                aria-pressed={active}
                aria-expanded={expandable ? expanded : undefined}
                className={className}
              >
                {content}
              </button>
            ) : (
              <Link
                key={category.id}
                href={`/?category=${category.id}`}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Задарсан дэд ангиллын мөр. Ангилалд 40 хүртэл дэд ангилал байдаг
          тул хэвтээ гүйлгэнэ. */}
      {openRow && onCategoryChange ? (
        <div className="border-t border-ink-700 bg-ink-950">
          <div className="mx-auto flex max-w-[1660px] items-stretch gap-2.5 overflow-x-auto px-4 py-4 xl:px-6">
            <button
              type="button"
              onClick={() => {
                onCategoryChange(openRow.slug);
                setOpenCategory("");
              }}
              aria-pressed={activeCategory === openRow.slug}
              className={`flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded-md border px-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide transition-colors ${
                activeCategory === openRow.slug
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-ink-700 bg-ink-850 text-[#aeb4bd] hover:border-ink-600 hover:text-white"
              }`}
            >
              Бүгдийг
              <br />
              харах
            </button>

            {openRow.children.map((child) => {
              const chosen = activeCategory === child.slug;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    onCategoryChange(chosen ? openRow.slug : child.slug);
                    setOpenCategory("");
                  }}
                  aria-pressed={chosen}
                  title={`${child.name} — ${formatNumber(child.productCount)} бараа`}
                  className={`group/tile flex h-[104px] w-[104px] shrink-0 flex-col overflow-hidden rounded-md border bg-ink-850 transition-colors ${
                    chosen
                      ? "border-brand"
                      : "border-ink-700 hover:border-ink-600"
                  }`}
                >
                  <span className="relative flex h-[58px] w-full items-center justify-center bg-gradient-to-b from-ink-700/40 to-ink-900">
                    {child.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={child.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : OpenIcon ? (
                      <OpenIcon className="h-7 w-7 text-mute-dim" />
                    ) : null}
                    <span className="absolute right-1 top-1 rounded bg-ink-950/80 px-1 text-[9.5px] font-semibold text-mute-dim">
                      {formatNumber(child.productCount)}
                    </span>
                  </span>
                  <span
                    className={`flex flex-1 items-center justify-center px-1.5 text-center text-[10px] font-bold uppercase leading-[1.15] tracking-wide transition-colors ${
                      chosen
                        ? "text-brand"
                        : "text-[#aeb4bd] group-hover/tile:text-white"
                    }`}
                  >
                    <span className="line-clamp-2">{child.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
