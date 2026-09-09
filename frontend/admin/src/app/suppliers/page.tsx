"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
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
  Table,
} from "@/components/ui";

interface Supplier {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  description: string | null;
  offerCount: number;
  warehouseCount: number;
}

export default function SuppliersPage() {
  const suppliers = useResource<Supplier[]>("/suppliers");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

  const rows = (suppliers.data ?? []).filter(
    (supplier) => !onlyPending || !supplier.verified,
  );

  const setVerified = async (supplier: Supplier, verified: boolean) => {
    setBusy(supplier.id);
    setError(null);
    try {
      await apiPatch(`/suppliers/${supplier.id}/verify`, { verified });
      suppliers.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const save = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await apiPatch(`/suppliers/${id}`, {
        name: draft.name.trim(),
        description: draft.description.trim(),
      });
      setEditing(null);
      suppliers.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Нийлүүлэгч"
        description="Нийлүүлэгчийг баталгаажуулах, мэдээллийг засах"
        action={
          <Button
            variant={onlyPending ? "primary" : "ghost"}
            onClick={() => setOnlyPending(!onlyPending)}
          >
            Баталгаажаагүй
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Нийлүүлэгчид"
          meta={`${formatNumber(rows.length)} байгууллага`}
        />
        {suppliers.loading ? (
          <Loading />
        ) : suppliers.error ? (
          <div className="p-4">
            <ErrorNote text={suppliers.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Нийлүүлэгч олдсонгүй" />
        ) : (
          <Table
            head={["Нэр", "Санал", "Агуулах", "Үнэлгээ", "Баталгаажилт", ""]}
          >
            {rows.map((supplier) => (
              <Row key={supplier.id}>
                {editing === supplier.id ? (
                  <>
                    <Cell>
                      <div className="flex flex-col gap-1.5">
                        <Input
                          value={draft.name}
                          onChange={(event) =>
                            setDraft({ ...draft, name: event.target.value })
                          }
                          className="w-56"
                        />
                        <Input
                          value={draft.description}
                          onChange={(event) =>
                            setDraft({ ...draft, description: event.target.value })
                          }
                          placeholder="Тайлбар"
                          className="w-72"
                        />
                      </div>
                    </Cell>
                    <Cell align="right">{supplier.offerCount}</Cell>
                    <Cell align="right">{supplier.warehouseCount}</Cell>
                    <Cell align="right">{supplier.rating.toFixed(1)}</Cell>
                    <Cell>
                      <Badge tone={supplier.verified ? "ok" : "warn"}>
                        {supplier.verified ? "Баталгаажсан" : "Хүлээгдэж буй"}
                      </Badge>
                    </Cell>
                    <Cell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === supplier.id}
                          onClick={() => save(supplier.id)}
                        >
                          Хадгалах
                        </Button>
                        <Button size="sm" onClick={() => setEditing(null)}>
                          Болих
                        </Button>
                      </div>
                    </Cell>
                  </>
                ) : (
                  <>
                    <Cell>
                      <div className="text-white">{supplier.name}</div>
                      <div className="text-[12px] text-mute-dim">
                        {supplier.description ?? supplier.slug}
                      </div>
                    </Cell>
                    <Cell align="right">{formatNumber(supplier.offerCount)}</Cell>
                    <Cell align="right">{supplier.warehouseCount}</Cell>
                    <Cell align="right">
                      <span className="tabular-nums text-white">
                        {supplier.rating.toFixed(1)}
                      </span>
                      <div className="text-[11.5px] text-mute-dim">
                        {supplier.reviewCount} үнэлгээ
                      </div>
                    </Cell>
                    <Cell>
                      <Badge tone={supplier.verified ? "ok" : "warn"}>
                        {supplier.verified ? "Баталгаажсан" : "Хүлээгдэж буй"}
                      </Badge>
                    </Cell>
                    <Cell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditing(supplier.id);
                            setDraft({
                              name: supplier.name,
                              description: supplier.description ?? "",
                            });
                          }}
                        >
                          Засах
                        </Button>
                        <Button
                          size="sm"
                          variant={supplier.verified ? "danger" : "primary"}
                          disabled={busy === supplier.id}
                          onClick={() => setVerified(supplier, !supplier.verified)}
                        >
                          {supplier.verified ? "Цуцлах" : "Батлах"}
                        </Button>
                      </div>
                    </Cell>
                  </>
                )}
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
