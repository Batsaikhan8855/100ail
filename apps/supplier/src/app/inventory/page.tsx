"use client";

import { useMemo, useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import {
  Badge,
  Button,
  Cell,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  Select,
  Table,
} from "@/components/ui";

interface InventoryRow {
  id: string;
  quantity: number;
  reserved: number;
  available: number;
  updatedAt: string;
  warehouse: { id: string; name: string; city: string };
  offer: {
    id: string;
    price: number;
    unit: string;
    productName: string;
    productSlug: string;
  };
}

const LOW_STOCK = 100;

export default function InventoryPage() {
  const inventory = useResource<InventoryRow[]>("/inventory/mine");
  const [query, setQuery] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = inventory.data ?? [];

  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) map.set(row.warehouse.id, row.warehouse.name);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const visible = rows.filter((row) => {
    if (warehouseId && row.warehouse.id !== warehouseId) return false;
    if (onlyLow && row.quantity > LOW_STOCK) return false;
    if (query.trim() === "") return true;
    return row.offer.productName.toLowerCase().includes(query.trim().toLowerCase());
  });

  const save = async (row: InventoryRow) => {
    const quantity = Number(value.replace(/[\s,]/g, ""));
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Үлдэгдэл сөрөг эсвэл буруу байна");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPatch("/inventory", {
        offerId: row.offer.id,
        warehouseId: row.warehouse.id,
        quantity,
      });
      setEditing(null);
      inventory.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Үлдэгдэл"
        description="Агуулах тус бүрийн үлдэгдлийг шинэчилнэ. Захиалгаар нөөцлөгдсөн тоог тусад нь харуулна."
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Барааны үлдэгдэл"
          meta={`${formatNumber(visible.length)} мөр`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Бараа хайх"
                className="w-44"
              />
              <Select
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                className="w-40"
              >
                <option value="">Бүх агуулах</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant={onlyLow ? "primary" : "ghost"}
                onClick={() => setOnlyLow(!onlyLow)}
              >
                Дуусч буй
              </Button>
            </div>
          }
        />

        {inventory.loading ? (
          <Loading />
        ) : inventory.error ? (
          <div className="p-4">
            <ErrorNote text={inventory.error} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState text="Мөр олдсонгүй" />
        ) : (
          <Table
            head={[
              "Бараа",
              "Агуулах",
              "Үлдэгдэл",
              "Нөөцөлсөн",
              "Боломжтой",
              "Шинэчилсэн",
              "",
            ]}
          >
            {visible.map((row) => (
              <Row key={row.id}>
                <Cell>
                  <div className="text-white">{row.offer.productName}</div>
                  <div className="text-[12px] text-mute-dim">{row.offer.unit}</div>
                </Cell>
                <Cell>
                  <div>{row.warehouse.name}</div>
                  <div className="text-[12px] text-mute-dim">{row.warehouse.city}</div>
                </Cell>
                <Cell align="right">
                  {editing === row.id ? (
                    <Input
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      className="w-24"
                      inputMode="numeric"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`tabular-nums ${
                        row.quantity <= LOW_STOCK ? "text-brand-hi" : "text-white"
                      }`}
                    >
                      {formatNumber(row.quantity)}
                    </span>
                  )}
                </Cell>
                <Cell align="right">
                  <span className="tabular-nums text-mute">
                    {formatNumber(row.reserved)}
                  </span>
                </Cell>
                <Cell align="right">
                  {row.available <= 0 ? (
                    <Badge tone="bad">Дууссан</Badge>
                  ) : (
                    <span className="tabular-nums text-white">
                      {formatNumber(row.available)}
                    </span>
                  )}
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute-dim">
                    {formatDateTime(row.updatedAt)}
                  </span>
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    {editing === row.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={() => save(row)}
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
                          setEditing(row.id);
                          setValue(String(row.quantity));
                          setError(null);
                        }}
                      >
                        Шинэчлэх
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
