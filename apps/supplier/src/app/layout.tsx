import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/components/session";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "100 Айл — Нийлүүлэгчийн систем",
  description:
    "Бараа, үнэ, үлдэгдэл, захиалга, хүргэлт, шимтгэлийн тооцоог удирдах систем.",
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
          <Shell>{children}</Shell>
        </SessionProvider>
      </body>
    </html>
  );
}
