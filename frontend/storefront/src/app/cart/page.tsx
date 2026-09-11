import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Сагс — barilgaHUB",
  description: "Сонгосон барилгын материалын сагс, нийлүүлэгч тус бүрийн дүн.",
};

export default function CartPage() {
  return <CartView />;
}
