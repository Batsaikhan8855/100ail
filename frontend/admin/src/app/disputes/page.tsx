"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { DISPUTE_STATUS } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import {
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
  StatusBadge,
  Table,
} from "@/components/ui";

interface Dispute {
  id: string;
  reason: string;
  detail: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  order: { code: string; total: number; buyerName: string };
  supplierOrder: { code: string; supplierId: string } | null;
}

export default function DisputesPage() {
  const disputes = useResource<Dispute[]>("/disputes/all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ status: "RESOLVED", resolution: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = disputes.data ?? [];

  const resolve = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await apiPatch(`/disputes/${id}/resolve`, {
        status: draft.status,
        resolution: draft.resolution.trim() || undefined,
      });
      setEditing(null);
      disputes.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Буцаалт, маргаан"
        description="Худалдан авагчийн гомдлыг хянаж шийдвэрлэнэ"
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader title="Гомдлууд" meta={`${rows.length} бүртгэл`} />
        {disputes.loading ? (
          <Loading />
        ) : disputes.error ? (
          <div className="p-4">
            <ErrorNote text={disputes.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Гомдол бүртгэгдээгүй байна" />
        ) : (
          <Table
            head={["Захиалга", "Шалтгаан", "Огноо", "Дүн", "Төлөв", "Шийдвэр", ""]}
          >
            {rows.map((dispute) => (
              <Row key={dispute.id}>
                <Cell>
                  <div className="text-fg">{dispute.order.code}</div>
                  <div className="text-[12px] text-mute-dim">
                    {dispute.order.buyerName}
                    {dispute.supplierOrder ? ` · ${dispute.supplierOrder.code}` : ""}
                  </div>
                </Cell>
                <Cell>
                  <div className="text-fg">{dispute.reason}</div>
                  {dispute.detail ? (
                    <div className="max-w-xs text-[12px] text-mute">
                      {dispute.detail}
                    </div>
                  ) : null}
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {formatDateTime(dispute.createdAt)}
                  </span>
                </Cell>
                <Cell align="right">
                  <span className="tabular-nums text-fg">
                    {formatPrice(dispute.order.total)}
                  </span>
                </Cell>
                <Cell>
                  <StatusBadge value={dispute.status} map={DISPUTE_STATUS} />
                </Cell>
                <Cell>
                  {editing === dispute.id ? (
                    <div className="flex flex-col gap-1.5">
                      <Select
                        value={draft.status}
                        onChange={(event) =>
                          setDraft({ ...draft, status: event.target.value })
                        }
                        className="w-40"
                      >
                        {Object.entries(DISPUTE_STATUS).map(([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={draft.resolution}
                        onChange={(event) =>
                          setDraft({ ...draft, resolution: event.target.value })
                        }
                        placeholder="Шийдвэрийн тайлбар"
                        className="w-56"
                      />
                    </div>
                  ) : (
                    <span className="text-[12px] text-mute">
                      {dispute.resolution ?? "—"}
                    </span>
                  )}
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    {editing === dispute.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === dispute.id}
                          onClick={() => resolve(dispute.id)}
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
                          setEditing(dispute.id);
                          setDraft({
                            status:
                              dispute.status === "OPEN" ? "IN_REVIEW" : dispute.status,
                            resolution: dispute.resolution ?? "",
                          });
                        }}
                      >
                        Шийдвэрлэх
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
