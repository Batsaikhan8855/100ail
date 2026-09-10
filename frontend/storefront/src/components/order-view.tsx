"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  PinIcon,
  TruckIcon,
} from "./icons";
import { SiteHeader } from "./site-header";
import { CopyButton, Panel, PanelHeader } from "./ui";

interface OrderItem {
  id: string;
  productName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

interface SupplierOrder {
  id: string;
  code: string;
  status: string;
  supplier: { id: string; slug: string; name: string };
  goodsTotal: number;
  deliveryPrice: number;
  total: number;
  items: OrderItem[];
  delivery: { trackingCode: string; status: string; city: string } | null;
}

interface Order {
  code: string;
  status: string;
  buyerName: string;
  phone: string;
  city: string;
  address: string;
  deliveryMethod: string;
  paymentMethod: string;
  goodsTotal: number;
  deliveryTotal: number;
  total: number;
  createdAt: string;
  payment: { id: string; status: string; method: string; amount: number } | null;
  supplierOrders: SupplierOrder[];
}

interface Invoice {
  paymentId: string;
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string | null;
  urls: { name: string; link: string }[];
  mode: "qpay" | "mock";
}

const ORDER_STATUS: Record<string, string> = {
  PENDING: "Төлбөр хүлээгдэж буй",
  PAID: "Төлөгдсөн",
  PROCESSING: "Боловсруулж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

const SUPPLIER_STATUS: Record<string, string> = {
  NEW: "Шинэ",
  CONFIRMED: "Баталгаажсан",
  PACKING: "Бэлтгэж буй",
  SHIPPED: "Замд гарсан",
  DELIVERED: "Хүргэгдсэн",
  CANCELLED: "Цуцлагдсан",
};

export function OrderView({ code }: { code: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOrder(await apiGet<Order>(`/orders/${code}`));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  // Төлбөр хүлээгдэж байвал нэхэмжлэх үүсгэнэ
  useEffect(() => {
    if (!order || order.status !== "PENDING" || invoice) return;
    apiPost<Invoice>("/payments/invoice", { orderCode: order.code })
      .then(setInvoice)
      .catch((cause: Error) => setError(cause.message));
  }, [invoice, order]);

  // QPay-ээр төлж байгаа үед төлөвийг тогтмол шалгана
  useEffect(() => {
    if (!invoice || invoice.mode !== "qpay" || order?.status !== "PENDING") return;
    const timer = setInterval(async () => {
      const result = await apiGet<{ paid: boolean }>(
        `/payments/${invoice.paymentId}/status`,
      ).catch(() => null);
      if (result?.paid) {
        clearInterval(timer);
        await load();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [invoice, load, order?.status]);

  /** Хөгжүүлэлтийн (mock) горимд төлбөрийг гараар баталгаажуулна */
  const confirmMock = async () => {
    if (!invoice) return;
    try {
      await apiPost("/payments/callback", { invoiceId: invoice.invoiceId });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="orders" />

      <main className="mx-auto max-w-[900px] px-4 py-6 xl:px-6">
        {loading ? (
          <Panel className="px-4 py-16 text-center text-[13px] text-mute">
            Ачаалж байна…
          </Panel>
        ) : error && !order ? (
          <Panel className="px-4 py-16 text-center">
            <p className="text-[15px] font-semibold text-white">{error}</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-ink-950"
            >
              Каталог руу буцах
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Panel>
        ) : order ? (
          <div className="flex flex-col gap-4">
            <Panel className="px-4 py-6 text-center sm:px-8">
              <span
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                  order.status === "PENDING"
                    ? "bg-brand/15 text-brand"
                    : "bg-ok/15 text-ok"
                }`}
              >
                {order.status === "PENDING" ? (
                  <ClockIcon className="h-7 w-7" />
                ) : (
                  <CheckIcon className="h-7 w-7" />
                )}
              </span>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <h1 className="text-[22px] font-bold text-white">
                  Захиалга {order.code}
                </h1>
                <CopyButton
                  value={order.code}
                  label="Захиалгын дугаар хуулах"
                />
              </div>
              <p className="mt-1.5 text-[13.5px] text-mute">
                {ORDER_STATUS[order.status] ?? order.status} ·{" "}
                {order.supplierOrders.length} нийлүүлэгч ·{" "}
                {new Date(order.createdAt).toLocaleString("mn-MN")}
              </p>
              <p className="mt-4 text-[15px] text-[#c2c7cf]">
                Нийт төлөх дүн:{" "}
                <span className="text-[20px] font-bold text-brand">
                  {formatPrice(order.total)}
                </span>
              </p>
            </Panel>

            {order.status === "PENDING" && invoice ? (
              <Panel>
                <PanelHeader
                  title="Төлбөр"
                  meta={invoice.mode === "qpay" ? "QPay" : "Хөгжүүлэлтийн горим"}
                />
                <div className="flex flex-col items-center gap-3 px-4 py-5">
                  {invoice.qrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        invoice.qrImage.startsWith("data:")
                          ? invoice.qrImage
                          : `data:image/png;base64,${invoice.qrImage}`
                      }
                      alt="QPay QR код"
                      className="h-48 w-48 rounded-md bg-white p-2"
                    />
                  ) : (
                    <p className="break-all rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-center font-mono text-[12px] text-[#c2c7cf]">
                      {invoice.qrText}
                    </p>
                  )}

                  {invoice.urls.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {invoice.urls.map((url) => (
                        <a
                          key={url.name}
                          href={url.link}
                          className="rounded-md border border-ink-600 px-3 py-1.5 text-[12.5px] text-[#c2c7cf] transition-colors hover:text-white"
                        >
                          {url.name}
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-[12.5px] text-mute">
                    Нэхэмжлэх: {invoice.invoiceId} · {formatPrice(invoice.amount)}
                  </p>

                  {invoice.mode === "mock" ? (
                    <button
                      type="button"
                      onClick={confirmMock}
                      className="rounded-md bg-brand px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi"
                    >
                      Төлбөрийг баталгаажуулах (демо)
                    </button>
                  ) : (
                    <p className="text-[12px] text-mute-dim">
                      Төлбөр хийгдмэгц энэ хуудас автоматаар шинэчлэгдэнэ.
                    </p>
                  )}
                </div>
              </Panel>
            ) : null}

            <Panel>
              <PanelHeader
                title="Дэд захиалгууд"
                meta={`${order.supplierOrders.length} нийлүүлэгч`}
              />
              <ul className="divide-y divide-ink-700">
                {order.supplierOrders.map((supplierOrder) => (
                  <li key={supplierOrder.id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-white">
                        {supplierOrder.supplier.name}
                      </span>
                      <span className="text-[13px] font-semibold text-brand">
                        {formatPrice(supplierOrder.total)}
                      </span>
                    </div>

                    <ul className="mt-1.5 flex flex-col gap-1">
                      {supplierOrder.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-baseline justify-between gap-3 text-[11.5px] text-mute"
                        >
                          <span className="truncate">
                            {item.productName} × {item.qty} {item.unit}
                          </span>
                          <span className="shrink-0 text-[#c6ccd4]">
                            {formatPrice(item.lineTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-mute">
                      <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[#c2c7cf]">
                        {SUPPLIER_STATUS[supplierOrder.status] ?? supplierOrder.status}
                      </span>
                      <span>{supplierOrder.code}</span>
                      {supplierOrder.delivery ? (
                        <span className="flex items-center gap-2">
                          <Link
                            href={`/track?code=${supplierOrder.delivery.trackingCode}`}
                            className="flex items-center gap-1.5 text-brand hover:underline"
                          >
                            <TruckIcon className="h-3.5 w-3.5" />
                            {supplierOrder.delivery.trackingCode}
                          </Link>
                          <CopyButton
                            value={supplierOrder.delivery.trackingCode}
                            label="Хянах код хуулах"
                          />
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="border-t border-ink-700 px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-[12.5px] text-mute">
                  <PinIcon className="h-3.5 w-3.5 text-brand" />
                  {order.city}, {order.address} · {order.buyerName} · {order.phone}
                </p>
              </div>
            </Panel>
          </div>
        ) : null}
      </main>
    </div>
  );
}
