"use client";

import Link from "next/link";
import { NAV_LINKS } from "@/data/catalog";
import { toCategory, type ApiCategory } from "@/lib/catalog-api";
import { useResource } from "@/lib/use-resource";
import { useCart } from "./cart-context";
import { NotificationBell } from "./notification-menu";
import { useSession } from "./session";
import { CATEGORY_ICONS, CartIcon, LogoMark, UserIcon } from "./icons";

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
          {(categories.data ?? []).map((row) => {
            const category = toCategory(row);
            const Icon = CATEGORY_ICONS[category.icon];
            const active = category.id === activeCategory;
            const content = (
              <>
                <Icon className="h-[22px] w-[22px]" />
                {category.name}
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
                onClick={() => onCategoryChange(active ? "" : category.id)}
                aria-pressed={active}
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
    </header>
  );
}
