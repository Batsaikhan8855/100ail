"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { PAYOUT_STATUS } from "@/lib/labels";
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
  StatCard,
  StatusBadge,
  Table,
} from "@/components/ui";

type PayoutStatus = "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  bankName: string;
  accountNo: string;
  accountName: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  supplier: { id: string; name: string; slug: string };
}

interface PayoutResponse {
  summary: { pending: number; paid: number; total: number };
  rows: Payout[];
}

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Бүгд" },
  { value: "REQUESTED", label: "Хүсэлт гаргасан" },
  { value: "APPROVED", label: "Батлагдсан" },
  { value: "PAID", label: "Шилжүүлсэн" },
  { value: "REJECTED", label: "Татгалзсан" },
];

export default function PayoutsPage() {
  const [filter, setFilter] = useState("");
  const payouts = useResource<PayoutResponse>(
    `/payouts/all${filter ? `?status=${filter}` : ""}`,
  );
  const [reference, setReference] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = async (payout: Payout, status: PayoutStatus) => {
    if (
      status === "PAID" &&
      !window.confirm(
        `${payout.supplier.name}-д ${formatPrice(payout.amount)} шилжүүлснийг баталгаажуулах уу?`,
      )
    ) {
      return;
    }

    setBusy(payout.id);
    setError(null);
    try {
      await apiPatch(`/payouts/${payout.id}/status`, {
        status,
        reference: reference[payout.id],
      });
      payouts.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const data = payouts.data;

  return (
    <>
      <PageHeader
        title="Татан авалт"
        description="Нийлүүлэгчийн мөнгө татан авах хүсэлтийг батлах, шилжүүлэг баталгаажуулах"
        action={
          <Select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-44"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {data ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Хүлээгдэж буй" value={formatPrice(data.summary.pending)} />
          <StatCard label="Шилжүүлсэн" value={formatPrice(data.summary.paid)} />
          <StatCard label="Нийт хүсэлт" value={String(data.summary.total)} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader title="Хүсэлтүүд" meta={`${data?.rows.length ?? 0} мөр`} />
        {payouts.loading ? (
          <Loading />
        ) : payouts.error ? (
          <div className="p-4">
            <ErrorNote text={payouts.error} />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState text="Татан авах хүсэлт байхгүй байна" />
        ) : (
          <Table
            head={["Нийлүүлэгч", "Огноо", "Дүн", "Данс", "Төлөв", "Гүйлгээний утга", ""]}
          >
            {data.rows.map((payout) => (
              <Row key={payout.id}>
                <Cell>
                  <span className="text-white">{payout.supplier.name}</span>
                  {payout.note ? (
                    <div className="text-[11.5px] text-mute-dim">{payout.note}</div>
                  ) : null}
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {formatDateTime(payout.createdAt)}
                  </span>
                  {payout.processedAt ? (
                    <div className="text-[11.5px] text-mute-dim">
                      {formatDateTime(payout.processedAt)}
                    </div>
                  ) : null}
                </Cell>
                <Cell align="right">
                  <Money value={payout.amount} />
                </Cell>
                <Cell>
                  <div className="text-[12px] text-white">{payout.bankName}</div>
                  <div className="text-[11.5px] tabular-nums text-mute">
                    {payout.accountNo}
                  </div>
                  <div className="text-[11.5px] text-mute-dim">{payout.accountName}</div>
                </Cell>
                <Cell>
                  <StatusBadge value={payout.status} map={PAYOUT_STATUS} />
                </Cell>
                <Cell>
                  {payout.status === "PAID" ? (
                    <span className="text-[12px] text-mute">{payout.reference ?? "—"}</span>
                  ) : (
                    <Input
                      value={reference[payout.id] ?? payout.reference ?? ""}
                      onChange={(event) =>
                        setReference({ ...reference, [payout.id]: event.target.value })
                      }
                      placeholder="TRX дугаар"
                      className="w-32"
                    />
                  )}
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    {payout.status === "REQUESTED" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busy === payout.id}
                          onClick={() => update(payout, "APPROVED")}
                        >
                          Батлах
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy === payout.id}
                          onClick={() => update(payout, "REJECTED")}
                        >
                          Татгалзах
                        </Button>
                      </>
                    ) : null}
                    {payout.status === "APPROVED" ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy === payout.id}
                        onClick={() => update(payout, "PAID")}
                      >
                        Шилжүүлсэн
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
