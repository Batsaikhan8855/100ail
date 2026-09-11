import { Suspense } from "react";
import type { Metadata } from "next";
import { FavoritesView } from "@/components/favorites-view";

export const metadata: Metadata = {
  title: "Хадгалсан бараа — BarilgaHUB",
  description: "Зүрхэлж хадгалсан барааныхаа үнэ, үлдэгдлийг хянана.",
};

export default function FavoritesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <FavoritesView />
    </Suspense>
  );
}
