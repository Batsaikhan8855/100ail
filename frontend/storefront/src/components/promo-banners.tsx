"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { ArrowRightIcon } from "./icons";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
}

/** Хэдэн секунд тутам дараагийн баннер руу шилжих вэ */
const ROTATE_MS = 7000;

/**
 * Нүүр хуудасны сурталчилгаа (баримтын 4.3 "сурталчилгаа").
 * Админ панелаас удирдагдаж, харагдалт ба дарагдалтын тоо бүртгэгдэнэ.
 */
export function PromoBanners() {
  const banners = useResource<Banner[]>("/banners?placement=HOME_HERO");
  const [index, setIndex] = useState(0);
  const router = useRouter();

  const rows = banners.data ?? [];

  useEffect(() => {
    if (rows.length < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % rows.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [rows.length]);

  if (rows.length === 0) return null;

  const banner = rows[Math.min(index, rows.length - 1)];

  const open = async () => {
    // Дарагдалтыг бүртгэнэ; амжилтгүй болсон ч шилжилт саадгүй явна
    await apiPost(`/banners/${banner.id}/click`).catch(() => undefined);
    if (banner.linkUrl) router.push(banner.linkUrl);
  };

  return (
    <section aria-label="Сурталчилгаа" className="mb-4">
      <button
        type="button"
        onClick={open}
        className="group relative flex w-full items-center overflow-hidden rounded-lg border border-ink-700 bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 px-5 py-5 text-left transition-colors hover:border-brand-lo sm:px-7 sm:py-6"
      >
        {banner.imageUrl ? (
          // Гадаад S3 хаяг тул next/image-гүйгээр харуулна
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.imageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : null}

        <div className="relative z-10 min-w-0 flex-1">
          <h2 className="text-[17px] font-bold tracking-tight text-white sm:text-[20px]">
            {banner.title}
          </h2>
          {banner.subtitle ? (
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-[#c2c7cf] sm:text-[13.5px]">
              {banner.subtitle}
            </p>
          ) : null}
        </div>

        {banner.linkUrl ? (
          <span className="relative z-10 ml-4 hidden shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[12.5px] font-bold uppercase tracking-wide text-ink-950 transition-colors group-hover:bg-brand-hi sm:flex">
            Үзэх
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        ) : null}

        {rows.length > 1 ? (
          <span className="absolute bottom-2.5 left-5 z-10 flex gap-1.5 sm:left-7">
            {rows.map((row, position) => (
              <span
                key={row.id}
                aria-hidden
                className={`h-1 rounded-full transition-all ${
                  position === index ? "w-5 bg-brand" : "w-2 bg-ink-600"
                }`}
              />
            ))}
          </span>
        ) : null}
      </button>
    </section>
  );
}
