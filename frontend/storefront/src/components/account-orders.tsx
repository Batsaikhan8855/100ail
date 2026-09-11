"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { useSession } from "./session";
import { SiteHeader } from "./site-header";
import { CopyButton, Panel, PanelHeader } from "./ui";
import { ArrowRightIcon } from "./icons";

interface OrderRow {
  code: string;
  status: string;
  total: number;
  createdAt: string;
  supplierOrders: { id: string; supplier: { name: string } }[];
}

const STATUS: Record<string, string> = {
  PENDING: "Төлбөр хүлээгдэж буй",
  PAID: "Төлөгдсөн",
  PROCESSING: "Боловсруулж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

export function AccountOrders() {
  const { user, ready } = useSession();
  const orders = useResource<OrderRow[]>(user ? "/orders/mine" : null);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="orders" />

      <main className="mx-auto max-w-[900px] px-4 py-6 xl:px-6">
        {!ready ? (
          <Panel className="px-4 py-16 text-center text-[13px] text-mute">
            Ачаалж байна…
          </Panel>
        ) : !user ? (
          <Panel className="px-4 py-16 text-center">
            <p className="text-[15px] font-semibold text-fg">
              Захиалгын түүхээ харахын тулд нэвтэрнэ үү
            </p>
            <p className="mt-1 text-[13px] text-mute">
              Зочноор хийсэн захиалгыг захиалгын дугаараар нь хайж болно.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-on-brand"
            >
              Нэвтрэх
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Panel>
        ) : (
          <Panel>
            <PanelHeader
              title="Миний захиалгууд"
              meta={`${orders.data?.length ?? 0} захиалга`}
            />
            {orders.loading ? (
              <p className="px-4 py-10 text-center text-[13px] text-mute">
                Ачаалж байна…
              </p>
            ) : orders.error ? (
              <p className="px-4 py-10 text-center text-[13px] text-danger">
                {orders.error}
              </p>
            ) : (orders.data ?? []).length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-mute">
                Захиалга алга байна.
              </p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {(orders.data ?? []).map((order) => (
                  <li
                    key={order.code}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-ink-800"
                  >
                    {/* Хуулах товч холбоос дотор байвал дарахад хуудас
                        солигдчихдог тул тусад нь байрлуулав */}
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <Link href={`/orders/${order.code}`} className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-fg">
                          {order.code}
                        </span>
                        <span className="block text-[11.5px] text-mute">
                          {new Date(order.createdAt).toLocaleString("mn-MN")} ·{" "}
                          {order.supplierOrders
                            .map((item) => item.supplier.name)
                            .join(", ")}
                        </span>
                      </Link>
                      <CopyButton
                        value={order.code}
                        label="Захиалгын дугаар хуулах"
                      />
                    </span>
                    <Link
                      href={`/orders/${order.code}`}
                      className="flex items-center gap-3"
                    >
                      <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[11.5px] text-mute">
                        {STATUS[order.status] ?? order.status}
                      </span>
                      <span className="text-[13.5px] font-bold text-brand">
                        {formatPrice(order.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </main>
    </div>
  );
}
