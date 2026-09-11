"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "barilgahub.theme";
type Theme = "light" | "dark";

/**
 * Light/dark унтраалга.
 *
 * Сонголтыг `<html data-theme>` дээр тавина — бүх өнгө `globals.css` дэх
 * CSS хувьсагчаар холбогдсон тул нэг шинж чанар өөрчлөхөд интерфейс
 * бүхэлдээ дагана.
 *
 * Эхний утгыг layout дахь мөрийн скрипт зурахаас өмнө тавьдаг (theme
 * анивчихаас сэргийлнэ). Энэ бүрдэл нь зөвхөн одоогийн утгыг уншиж
 * авна — тиймээс hydration хүртэл icon-ыг харуулахгүй, эс бөгөөс сервер
 * дээр аль theme болохыг мэдэхгүй тул зөрчил гарна.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Хувийн горимд хадгалалт хаалттай байж болно — сонголт зөвхөн
      // энэ хуудсанд хүчинтэй байна.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      // Hydration хүртэл хоосон байх тул хэмжээ нь тогтмол — байрлал
      // үсрэхгүй.
      aria-label={theme === "light" ? "Бараан горим" : "Цайвар горим"}
      title={theme === "light" ? "Бараан горим" : "Цайвар горим"}
      className={`flex h-10 w-10 items-center justify-center rounded-md text-mute transition-colors hover:text-fg ${className}`}
    >
      {theme === null ? null : theme === "light" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
}

const SunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path
      strokeLinecap="round"
      d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
    />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
    <path strokeLinejoin="round" d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.8 6.8 0 0 0 9.5 9.5Z" />
  </svg>
);
