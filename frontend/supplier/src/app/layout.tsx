import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/components/session";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "BarilgaHUB — Нийлүүлэгчийн систем",
  description:
    "Бараа, үнэ, үлдэгдэл, захиалга, хүргэлт, шимтгэлийн тооцоог удирдах систем.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d0f" },
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
  ],
  colorScheme: "dark light",
};

/**
 * Theme-ийг зурахаас ӨМНӨ тогтооно.
 *
 * React hydration хүлээвэл эхлээд бараан хувилбар зурагдаад дараа нь
 * цайвар руу үсэрч анивчина. Тиймээс энэ богино скрипт `<head>`-д
 * синхроноор ажиллаж `data-theme`-ийг тавина. Хадгалсан сонголт байхгүй
 * бол системийн тохиргоог дагана.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("barilgahub.theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SessionProvider>
          <Shell>{children}</Shell>
        </SessionProvider>
      </body>
    </html>
  );
}
