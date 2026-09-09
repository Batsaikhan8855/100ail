import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthView } from "@/components/auth-view";

export const metadata: Metadata = {
  title: "Нэвтрэх — 100 Айл",
  description: "Захиалгын түүх, хүргэлтээ хянахын тулд нэвтэрнэ үү.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <AuthView />
    </Suspense>
  );
}
