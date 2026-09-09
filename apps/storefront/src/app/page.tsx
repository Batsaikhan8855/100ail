import { Suspense } from "react";
import { Storefront } from "@/components/storefront";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <Storefront />
    </Suspense>
  );
}
