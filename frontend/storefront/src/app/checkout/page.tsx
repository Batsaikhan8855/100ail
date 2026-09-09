import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = {
  title: "Төлбөр — 100 Айл",
  description:
    "Хүргэлтийн мэдээлэл, төлбөрийн хэлбэр сонгож захиалгаа баталгаажуулна.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
