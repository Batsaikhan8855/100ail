"use client";

import { useState, type FormEvent } from "react";
import { apiPatch, apiPost } from "@/lib/api";
import { formatDate, formatDateTime, formatPercent, formatPrice } from "@/lib/format";
import { COMMISSION_STATUS, PAYOUT_STATUS } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import {
  Button,
  Cell,
  EmptyState,
  ErrorNote,
  Field,
  Input,
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

interface CommissionResponse {
  summary: {
    sales: number;
    commission: number;
    unpaid: number;
    settled: number;
    payout: number;
  };
  rows: {
    id: string;
    orderCode: string;
    base: number;
    rate: number;
    amount: number;
    status: string;
    createdAt: string;
  }[];
}

interface BankAccount {
  bankName: string;
  accountNo: string;
  accountName: string;
}

interface PayoutResponse {
  balance: {
    earned: number;
    commission: number;
    net: number;
    requested: number;
    approved: number;
    paid: number;
    available: number;
    orderCount: number;
  };
  account: BankAccount | null;
  rows: {
    id: string;
    amount: number;
    status: string;
    bankName: string;
    accountNo: string;
    reference: string | null;
    note: string | null;
    createdAt: string;
    processedAt: string | null;
  }[];
}

export default function CommissionsPage() {
  const commissions = useResource<CommissionResponse>("/commissions/mine");
  const payouts = useResource<PayoutResponse>("/payouts/mine");

  if (commissions.loading || payouts.loading) return <Loading />;
  if (commissions.error) return <ErrorNote text={commissions.error} />;
  if (payouts.error) return <ErrorNote text={payouts.error} />;
  if (!commissions.data || !payouts.data) return null;

  const { summary, rows } = commissions.data;
  const { balance } = payouts.data;

  return (
    <>
      <PageHeader
        title="Шимтгэл ба тооцоо"
        description="Гүйлгээ бүрээс платформын шимтгэл хасагдаж, үлдэх дүнг та татан авах хүсэлтээр авна."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Борлуулалт" value={formatPrice(summary.sales)} />
        <StatCard
          label="Платформын шимтгэл"
          value={formatPrice(summary.commission)}
          hint={`Төлөгдөөгүй: ${formatPrice(summary.unpaid)}`}
        />
        <StatCard
          label="Татан авсан"
          value={formatPrice(balance.paid)}
          hint={`Хүлээгдэж буй: ${formatPrice(balance.requested + balance.approved)}`}
        />
        <StatCard
          label="Татан авах боломжтой"
          value={formatPrice(balance.available)}
          hint={`${balance.orderCount} төлөгдсөн захиалгаас`}
        />
      </div>

      <PayoutSection data={payouts.data} onChange={() => payouts.reload()} />

      <Panel className="mt-4">
        <PanelHeader title="Шимтгэлийн бүртгэл" meta={`${rows.length} мөр`} />
        {rows.length === 0 ? (
          <EmptyState text="Шимтгэл бүртгэгдээгүй байна" />
        ) : (
          <Table
            head={["Захиалга", "Огноо", "Суурь дүн", "Хувь", "Шимтгэл", "Төлөв"]}
          >
            {rows.map((row) => (
              <Row key={row.id}>
                <Cell>
                  <span className="text-white">{row.orderCode}</span>
                </Cell>
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
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

/** Данс бүртгэх, татан авах хүсэлт гаргах, түүхээ харах */
function PayoutSection({
  data,
  onChange,
}: {
  data: PayoutResponse;
  onChange: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState<BankAccount>(
    data.account ?? { bankName: "", accountNo: "", accountName: "" },
  );
  const [editingAccount, setEditingAccount] = useState(data.account === null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/payouts/bank-account", account);
      setEditingAccount(false);
      setOk("Дансны мэдээлэл хадгалагдлаа");
      onChange();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const request = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount.replace(/[^\d]/g, ""));
    if (!value) {
      setError("Татан авах дүнг оруулна уу");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/payouts", { amount: value, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      setOk("Татан авах хүсэлт илгээгдлээ");
      onChange();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm("Хүсэлтийг цуцлах уу?")) return;
    setError(null);
    try {
      await apiPatch(`/payouts/${id}/cancel`);
      onChange();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Төлбөр татан авах"
        meta={`Боломжит үлдэгдэл: ${formatPrice(data.balance.available)}`}
        action={
          data.account && !editingAccount ? (
            <Button size="sm" onClick={() => setEditingAccount(true)}>
              Данс засах
            </Button>
          ) : null
        }
      />

      <div className="space-y-4 p-4">
        {error ? <ErrorNote text={error} /> : null}
        {ok ? <div className="text-[12.5px] text-ok">{ok}</div> : null}

        {editingAccount ? (
          <form onSubmit={saveAccount} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Банк">
                <Input
                  value={account.bankName}
                  onChange={(event) =>
                    setAccount({ ...account, bankName: event.target.value })
                  }
                  placeholder="Хаан банк"
                />
              </Field>
              <Field label="Дансны дугаар">
                <Input
                  value={account.accountNo}
                  onChange={(event) =>
                    setAccount({ ...account, accountNo: event.target.value })
                  }
                  inputMode="numeric"
                />
              </Field>
              <Field label="Данс эзэмшигч">
                <Input
                  value={account.accountName}
                  onChange={(event) =>
                    setAccount({ ...account, accountName: event.target.value })
                  }
                  placeholder="Компанийн нэр"
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                Данс хадгалах
              </Button>
              {data.account ? (
                <Button onClick={() => setEditingAccount(false)}>Болих</Button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="rounded-md border border-ink-700 bg-ink-900 px-3.5 py-3 text-[13px]">
            <span className="text-white">{data.account?.bankName}</span>
            <span className="mx-2 text-mute-dim">·</span>
            <span className="tabular-nums text-white">{data.account?.accountNo}</span>
            <span className="mx-2 text-mute-dim">·</span>
            <span className="text-mute">{data.account?.accountName}</span>
          </div>
        )}

        <form onSubmit={request} className="grid gap-3 md:grid-cols-[200px_1fr_auto] md:items-end">
          <Field label="Татан авах дүн (₮)">
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={String(data.balance.available)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Тэмдэглэл">
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Жишээ: 9-р сарын тооцоо"
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || data.balance.available <= 0 || editingAccount}
          >
            {busy ? "Илгээж байна…" : "Хүсэлт илгээх"}
          </Button>
        </form>

        {data.rows.length === 0 ? (
          <EmptyState text="Татан авах хүсэлт байхгүй байна" />
        ) : (
          <div className="rounded-md border border-ink-700">
            <Table head={["Огноо", "Дүн", "Данс", "Төлөв", "Гүйлгээний утга", ""]}>
              {data.rows.map((row) => (
                <Row key={row.id}>
                  <Cell>
                    <span className="text-[12px] text-mute">
                      {formatDateTime(row.createdAt)}
                    </span>
                  </Cell>
                  <Cell align="right">
                    <Money value={row.amount} />
                  </Cell>
                  <Cell>
                    <span className="text-[12px] text-mute">
                      {row.bankName} {row.accountNo}
                    </span>
                  </Cell>
                  <Cell>
                    <StatusBadge value={row.status} map={PAYOUT_STATUS} />
                  </Cell>
                  <Cell>
                    <span className="text-[12px] text-mute-dim">
                      {row.reference ?? row.note ?? "—"}
                    </span>
                  </Cell>
                  <Cell>
                    {row.status === "REQUESTED" ? (
                      <div className="flex justify-end">
                        <Button size="sm" variant="danger" onClick={() => cancel(row.id)}>
                          Цуцлах
                        </Button>
                      </div>
                    ) : null}
                  </Cell>
                </Row>
              ))}
            </Table>
          </div>
        )}
      </div>
    </Panel>
  );
}
