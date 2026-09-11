"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import {
  DELIVERY_METHOD,
  DELIVERY_STATUS,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  SUPPLIER_ORDER_STATUS,
} from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import {
  Badge,
  Button,
  Cell,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Money,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  Select,
  StatusBadge,
  Table,
} from "@/components/ui";

interface AdminOrder {
  id: string;
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
  organization: { id: string; name: string; regNo: string } | null;
  payment: {
    id: string;
    method: string;
    status: string;
    amount: number;
    paidAt: string | null;
  } | null;
  supplierOrders: {
    id: string;
    code: string;
    status: string;
    supplier: { id: string; name: string };
    goodsTotal: number;
    deliveryPrice: number;
    total: number;
    items: {
      id: string;
      productName: string;
      qty: number;
      unit: string;
      lineTotal: number;
    }[];
    delivery: { trackingCode: string; status: string } | null;
    commission: { amount: number } | null;
  }[];
}

export default function AdminOrdersPage() {
  const orders = useResource<AdminOrder[]>("/orders/all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = (orders.data ?? []).filter((order) => {
    if (status && order.status !== status) return false;
    if (query.trim() === "") return true;
    const needle = query.trim().toLowerCase();
    return (
      order.code.toLowerCase().includes(needle) ||
      order.buyerName.toLowerCase().includes(needle) ||
      order.phone.includes(needle)
    );
  });

  const refund = async (paymentId: string) => {
    if (!window.confirm("Төлбөрийг буцаах уу?")) return;
    setBusy(paymentId);
    setError(null);
    try {
      await apiPost(`/payments/${paymentId}/refund`);
      orders.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Захиалга, төлбөр"
        description="Сүүлийн 50 захиалга. Нэг захиалга нийлүүлэгч тус бүрийн дэд захиалгад хуваагдана."
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Захиалгууд"
          meta={`${formatNumber(rows.length)} захиалга`}
          action={
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Код, нэр, утас"
                className="w-44"
              />
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-44"
              >
                <option value="">Бүх төлөв</option>
                {Object.entries(ORDER_STATUS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {orders.loading ? (
          <Loading />
        ) : orders.error ? (
          <div className="p-4">
            <ErrorNote text={orders.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Захиалга олдсонгүй" />
        ) : (
          <Table
            head={["Код", "Худалдан авагч", "Огноо", "Дүн", "Төлбөр", "Төлөв", ""]}
          >
            {rows.map((order) => (
              <Row key={order.id}>
                <Cell>
                  <button
                    type="button"
                    onClick={() => setOpen(open === order.id ? null : order.id)}
                    className="text-left text-fg hover:text-brand"
                  >
                    {order.code}
                  </button>
                  <div className="text-[11.5px] text-mute-dim">
                    {order.supplierOrders.length} нийлүүлэгч
                  </div>

                  {open === order.id ? (
                    <div className="mt-2 space-y-2 rounded-md border border-ink-700 bg-ink-900 p-2.5 text-[12px]">
                      <div className="text-mute">
                        {DELIVERY_METHOD[order.deliveryMethod] ?? order.deliveryMethod}{" "}
                        · {order.city}, {order.address}
                      </div>
                      {order.organization ? (
                        <div className="text-mute">
                          Байгууллага: {order.organization.name} (
                          {order.organization.regNo})
                        </div>
                      ) : null}
                      {order.supplierOrders.map((supplierOrder) => (
                        <div
                          key={supplierOrder.id}
                          className="border-t border-ink-700 pt-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-fg">
                              {supplierOrder.supplier.name}
                            </span>
                            <StatusBadge
                              value={supplierOrder.status}
                              map={SUPPLIER_ORDER_STATUS}
                            />
                          </div>
                          {supplierOrder.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between gap-3 py-0.5 text-mute"
                            >
                              <span>
                                {item.productName} × {formatNumber(item.qty)}{" "}
                                {item.unit}
                              </span>
                              <span className="tabular-nums">
                                {formatPrice(item.lineTotal)}
                              </span>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-3 pt-1 text-mute-dim">
                            <span>Дүн: {formatPrice(supplierOrder.total)}</span>
                            {supplierOrder.commission ? (
                              <span>
                                Шимтгэл: {formatPrice(supplierOrder.commission.amount)}
                              </span>
                            ) : null}
                            {supplierOrder.delivery ? (
                              <span>
                                Хүргэлт: {supplierOrder.delivery.trackingCode} ·{" "}
                                {DELIVERY_STATUS[supplierOrder.delivery.status]?.label ??
                                  supplierOrder.delivery.status}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Cell>
                <Cell>
                  <div className="text-fg">{order.buyerName}</div>
                  <div className="text-[12px] text-mute-dim">{order.phone}</div>
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {formatDateTime(order.createdAt)}
                  </span>
                </Cell>
                <Cell align="right">
                  <Money value={order.total} />
                  <div className="text-[11.5px] text-mute-dim">
                    Хүргэлт {formatPrice(order.deliveryTotal)}
                  </div>
                </Cell>
                <Cell>
                  {order.payment ? (
                    <>
                      <StatusBadge value={order.payment.status} map={PAYMENT_STATUS} />
                      <div className="mt-1 text-[11.5px] text-mute-dim">
                        {PAYMENT_METHOD[order.payment.method] ?? order.payment.method}
                      </div>
                    </>
                  ) : (
                    <Badge>Нэхэмжлэхгүй</Badge>
                  )}
                </Cell>
                <Cell>
                  <StatusBadge value={order.status} map={ORDER_STATUS} />
                </Cell>
                <Cell>
                  <div className="flex justify-end">
                    {order.payment && order.payment.status === "PAID" ? (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy === order.payment.id}
                        onClick={() => refund(order.payment!.id)}
                      >
                        Буцаах
                      </Button>
                    ) : null}
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
