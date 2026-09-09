"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { DELIVERY_STATUS } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import {
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

interface DeliveryRow {
  id: string;
  trackingCode: string;
  status: string;
  city: string;
  address: string;
  driverName: string | null;
  driverPhone: string | null;
  orderCode: string;
  buyerName: string;
  phone: string;
  total: number;
}

export default function DeliveriesPage() {
  const deliveries = useResource<DeliveryRow[]>("/deliveries/mine");
  const [editing, setEditing] = useState<string | null>(null);
  const [driver, setDriver] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = deliveries.data ?? [];

  const update = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await apiPatch(`/deliveries/${id}`, body);
      setEditing(null);
      deliveries.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Хүргэлт"
        description="Жолооч хуваарилах, хүргэлтийн төлөв шинэчлэх. Төлөв солиход худалдан авагчид мэдэгдэнэ."
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Хүргэлтүүд"
          meta={`${formatNumber(rows.length)} хүргэлт`}
        />
        {deliveries.loading ? (
          <Loading />
        ) : deliveries.error ? (
          <div className="p-4">
            <ErrorNote text={deliveries.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Хүргэлт алга" />
        ) : (
          <Table
            head={["Хянах код", "Захиалга", "Хаяг", "Жолооч", "Дүн", "Төлөв", ""]}
          >
            {rows.map((delivery) => (
              <Row key={delivery.id}>
                <Cell>
                  <span className="font-mono text-[12.5px] text-white">
                    {delivery.trackingCode}
                  </span>
                </Cell>
                <Cell>
                  <div className="text-white">{delivery.orderCode}</div>
                  <div className="text-[12px] text-mute-dim">
                    {delivery.buyerName} · {delivery.phone}
                  </div>
                </Cell>
                <Cell>
                  <div>{delivery.city}</div>
                  <div className="text-[12px] text-mute-dim">{delivery.address}</div>
                </Cell>
                <Cell>
                  {editing === delivery.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={driver.name}
                        onChange={(event) =>
                          setDriver({ ...driver, name: event.target.value })
                        }
                        placeholder="Нэр"
                        className="w-28"
                      />
                      <Input
                        value={driver.phone}
                        onChange={(event) =>
                          setDriver({ ...driver, phone: event.target.value })
                        }
                        placeholder="Утас"
                        className="w-28"
                      />
                    </div>
                  ) : delivery.driverName ? (
                    <>
                      <div className="text-white">{delivery.driverName}</div>
                      <div className="text-[12px] text-mute-dim">
                        {delivery.driverPhone ?? "—"}
                      </div>
                    </>
                  ) : (
                    <span className="text-mute-dim">Хуваарилаагүй</span>
                  )}
                </Cell>
                <Cell align="right">
                  <Money value={delivery.total} />
                </Cell>
                <Cell>
                  <Select
                    value={delivery.status}
                    disabled={busy === delivery.id}
                    onChange={(event) =>
                      update(delivery.id, { status: event.target.value })
                    }
                    className="w-40"
                  >
                    {Object.entries(DELIVERY_STATUS).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </Select>
                  <div className="mt-1">
                    <StatusBadge value={delivery.status} map={DELIVERY_STATUS} />
                  </div>
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    {editing === delivery.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === delivery.id}
                          onClick={() =>
                            update(delivery.id, {
                              driverName: driver.name,
                              driverPhone: driver.phone,
                              ...(delivery.status === "PENDING"
                                ? { status: "ASSIGNED" }
                                : {}),
                            })
                          }
                        >
                          Хадгалах
                        </Button>
                        <Button size="sm" onClick={() => setEditing(null)}>
                          Болих
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditing(delivery.id);
                          setDriver({
                            name: delivery.driverName ?? "",
                            phone: delivery.driverPhone ?? "",
                          });
                        }}
                      >
                        Жолооч
                      </Button>
                    )}
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
