import type { Metadata } from "next";
import { AccountOrders } from "@/components/account-orders";

export const metadata: Metadata = {
  title: "Захиалгын түүх — barilgaHUB",
  description: "Өөрийн захиалгууд, төлөв, төлбөрийн байдал.",
};

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
