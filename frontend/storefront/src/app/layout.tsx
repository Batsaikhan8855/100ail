import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/cart-context";
import { FavoritesProvider } from "@/components/favorites-context";
import { SessionProvider } from "@/components/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "BarilgaHUB — Барилгын материалын маркетплейс",
  description:
    "Олон нийлүүлэгчийн барилгын материалыг үнэ, үлдэгдэл, байршил, хүргэлтийн нөхцөлөөр харьцуулан худалдан авах платформ.",
};

export const viewport: Viewport = {
  themeColor: "#0b0c0f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body>
        <SessionProvider>
          <CartProvider>
            <FavoritesProvider>{children}</FavoritesProvider>
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
