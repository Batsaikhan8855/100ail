import { Suspense } from "react";
import type { Metadata } from "next";
import { TrackView } from "@/components/track-view";

export const metadata: Metadata = {
  title: "Хүргэлт хянах — barilgaHUB",
  description: "Хянах кодоор хүргэлтийн явцыг шалгана.",
};

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <TrackView />
    </Suspense>
  );
}
