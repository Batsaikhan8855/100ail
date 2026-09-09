"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { SUPPLIER_ORDER_FLOW, SUPPLIER_ORDER_STATUS } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import {
  Button,
  Cell,
  EmptyState,
  ErrorNote,
  Loading,
  Money,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  StatusBadge,
  Table,
} from "@/components/ui";

interface OrderItem {
  id: string;
  productName: string;
  unitPrice: number;
  qty: number;
  unit: string;
  lineTotal: number;
}

interface SupplierOrder {
  id: string;
  code: string;
  orderCode: string;
  status: string;
  goodsTotal: number;
  deliveryPrice: number;
  total: number;
  createdAt: string;
  commission: { amount: number; rate: number } | null;
  delivery: { trackingCode: string; status: string } | null;
  items: OrderItem[];
  buyer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    note: string | null;
  };
}

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Бүгд" },
  ...SUPPLIER_ORDER_FLOW.map((status) => ({
    value: status,
    label: SUPPLIER_ORDER_STATUS[status].label,
  })),
];

/** Тухайн төлвөөс дараагийн боломжит төлөв */
const nextStatus = (status: string): string | null => {
  const index = SUPPLIER_ORDER_FLOW.indexOf(
    status as (typeof SUPPLIER_ORDER_FLOW)[number],
  );
  if (index < 0 || index === SUPPLIER_ORDER_FLOW.length - 1) return null;
  return SUPPLIER_ORDER_FLOW[index + 1];
};

export default function OrdersPage() {
  const [filter, setFilter] = useState("");
  const orders = useResource<SupplierOrder[]>(
    `/orders/supplier${filter ? `?status=${filter}` : ""}`,
  );
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = orders.data ?? [];

  const changeStatus = async (id: string, status: string) => {
    setBusy(id);
    setError(null);
    try {
      await apiPatch(`/orders/supplier-orders/${id}/status`, { status });
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
        title="Захиалга"
        description="Танд ирсэн дэд захиалгууд. Төлөв өөрчлөхөд худалдан авагчид мэдэгдэл очно."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "primary" : "ghost"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Дэд захиалгууд"
          meta={`${formatNumber(rows.length)} захиалга`}
        />
        {orders.loading ? (
          <Loading />
        ) : orders.error ? (
          <div className="p-4">
            <ErrorNote text={orders.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Захиалга алга" />
        ) : (
          <Table
            head={["Код", "Худалдан авагч", "Огноо", "Дүн", "Шимтгэл", "Төлөв", ""]}
          >
            {rows.map((order) => {
              const next = nextStatus(order.status);
              return (
                <Row key={order.id}>
                  <Cell>
                    <button
                      type="button"
                      onClick={() => setOpen(open === order.id ? null : order.id)}
                      className="text-left text-white hover:text-brand"
                    >
                      {order.code}
                    </button>
                    <div className="text-[11.5px] text-mute-dim">
                      {order.orderCode}
                    </div>
                    {open === order.id ? (
                      <div className="mt-2 space-y-1 rounded-md border border-ink-700 bg-ink-900 p-2.5 text-[12px]">
                        <div className="text-white">{order.buyer.name}</div>
                        <div className="text-mute">{order.buyer.phone}</div>
                        <div className="text-mute">
                          {order.buyer.city}, {order.buyer.address}
                        </div>
                        {order.buyer.note ? (
                          <div className="text-mute-dim">Тэмдэглэл: {order.buyer.note}</div>
                        ) : null}
                        <div className="mt-2 border-t border-ink-700 pt-2">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between gap-3 py-0.5"
                            >
                              <span className="text-[#c2c7cf]">
                                {item.productName} × {formatNumber(item.qty)} {item.unit}
                              </span>
                              <span className="tabular-nums text-white">
                                {formatPrice(item.lineTotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {order.delivery ? (
                          <div className="text-mute-dim">
                            Хүргэлтийн код: {order.delivery.trackingCode}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Cell>
                  <Cell>
                    <div className="text-white">{order.buyer.name}</div>
                    <div className="text-[12px] text-mute-dim">{order.buyer.city}</div>
                  </Cell>
                  <Cell>
                    <span className="text-[12px] text-mute">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </Cell>
                  <Cell align="right">
                    <Money value={order.total} />
                    <div className="text-[11.5px] text-mute-dim">
                      Хүргэлт {formatPrice(order.deliveryPrice)}
                    </div>
                  </Cell>
                  <Cell align="right">
                    {order.commission ? (
                      <span className="tabular-nums text-mute">
                        {formatPrice(order.commission.amount)}
                      </span>
                    ) : (
                      <span className="text-mute-dim">—</span>
                    )}
                  </Cell>
                  <Cell>
                    <StatusBadge value={order.status} map={SUPPLIER_ORDER_STATUS} />
                  </Cell>
                  <Cell>
                    <div className="flex justify-end gap-1.5">
                      {next ? (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === order.id}
                          onClick={() => changeStatus(order.id, next)}
                        >
                          {SUPPLIER_ORDER_STATUS[next].label}
                        </Button>
                      ) : null}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy === order.id}
                          onClick={() => changeStatus(order.id, "CANCELLED")}
                        >
                          Цуцлах
                        </Button>
                      ) : null}
                    </div>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>
    </>
  );
}
