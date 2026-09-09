"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatDate, formatPercent, formatPrice } from "@/lib/format";
import { COMMISSION_STATUS } from "@/lib/labels";
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
  StatCard,
  StatusBadge,
  Table,
} from "@/components/ui";

interface Overview {
  totalSales: number;
  totalCommission: number;
  unpaid: number;
  suppliers: { id: string; name: string; sales: number; commission: number }[];
}

interface LedgerRow {
  id: string;
  supplier: { id: string; name: string };
  orderCode: string;
  base: number;
  rate: number;
  amount: number;
  status: string;
  settledAt: string | null;
  createdAt: string;
}

export default function AdminCommissionsPage() {
  const [status, setStatus] = useState("");
  const overview = useResource<Overview>("/commissions/overview");
  const ledger = useResource<LedgerRow[]>(
    `/commissions/all${status ? `?status=${status}` : ""}`,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settle = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await apiPatch(`/commissions/${id}/settle`);
      ledger.reload();
      overview.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Шимтгэл"
        description="Гүйлгээ бүрээс хуримтлагдсан платформын шимтгэл, нийлүүлэгчтэй хийх тооцоо"
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {overview.loading ? (
        <Loading />
      ) : overview.error ? (
        <ErrorNote text={overview.error} />
      ) : overview.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Нийт борлуулалт" value={formatPrice(overview.data.totalSales)} />
          <StatCard
            label="Нийт шимтгэл"
            value={formatPrice(overview.data.totalCommission)}
          />
          <StatCard label="Тооцоо хийгдээгүй" value={formatPrice(overview.data.unpaid)} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel>
          <PanelHeader title="Нийлүүлэгчээр" />
          {(overview.data?.suppliers ?? []).length === 0 ? (
            <EmptyState text="Мэдээлэл алга" />
          ) : (
            <Table head={["Нийлүүлэгч", "Борлуулалт", "Шимтгэл"]}>
              {(overview.data?.suppliers ?? []).map((supplier) => (
                <Row key={supplier.id}>
                  <Cell>{supplier.name}</Cell>
                  <Cell align="right">
                    <Money value={supplier.sales} />
                  </Cell>
                  <Cell align="right">
                    <Money value={supplier.commission} />
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Шимтгэлийн бүртгэл"
            action={
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={status === "" ? "primary" : "ghost"}
                  onClick={() => setStatus("")}
                >
                  Бүгд
                </Button>
                {Object.entries(COMMISSION_STATUS).map(([value, meta]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={status === value ? "primary" : "ghost"}
                    onClick={() => setStatus(value)}
                  >
                    {meta.label}
                  </Button>
                ))}
              </div>
            }
          />
          {ledger.loading ? (
            <Loading />
          ) : ledger.error ? (
            <div className="p-4">
              <ErrorNote text={ledger.error} />
            </div>
          ) : (ledger.data ?? []).length === 0 ? (
            <EmptyState text="Мөр олдсонгүй" />
          ) : (
            <Table
              head={["Захиалга", "Нийлүүлэгч", "Огноо", "Суурь", "Хувь", "Шимтгэл", "Төлөв", ""]}
            >
              {(ledger.data ?? []).map((row) => (
                <Row key={row.id}>
                  <Cell>
                    <span className="text-white">{row.orderCode}</span>
                  </Cell>
                  <Cell>{row.supplier.name}</Cell>
                  <Cell>
                    <span className="text-[12px] text-mute">
                      {formatDate(row.createdAt)}
                    </span>
                  </Cell>
                  <Cell align="right">
                    <Money value={row.base} />
                  </Cell>
                  <Cell align="right">{formatPercent(row.rate)}</Cell>
                  <Cell align="right">
                    <Money value={row.amount} />
                  </Cell>
                  <Cell>
                    <StatusBadge value={row.status} map={COMMISSION_STATUS} />
                  </Cell>
                  <Cell>
                    <div className="flex justify-end">
                      {row.status !== "SETTLED" ? (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === row.id}
                          onClick={() => settle(row.id)}
                        >
                          Тооцоо хаах
                        </Button>
                      ) : null}
                    </div>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
