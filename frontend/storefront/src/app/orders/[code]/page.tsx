import type { Metadata } from "next";
import { OrderView } from "@/components/order-view";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Захиалга ${code} — BarilgaHUB`,
    description: "Захиалгын төлөв, төлбөр, хүргэлтийн явц.",
  };
}

export default async function OrderPage({ params }: PageProps) {
  const { code } = await params;
  return <OrderView code={code} />;
}
