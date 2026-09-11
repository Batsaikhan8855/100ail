"use client";

import { useState, type FormEvent } from "react";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import {
  Badge,
  Button,
  Cell,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Loading,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  Table,
} from "@/components/ui";

interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string | null;
  percentOff: number | null;
  amountOff: number | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function PromotionsPage() {
  const promotions = useResource<Promotion[]>("/promotions/all");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = promotions.data ?? [];

  const toggle = async (promotion: Promotion) => {
    setBusy(promotion.id);
    setError(null);
    try {
      await apiPatch(`/promotions/${promotion.id}`, { active: !promotion.active });
      promotions.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (promotion: Promotion) => {
    if (!window.confirm(`"${promotion.code}" урамшууллыг устгах уу?`)) return;
    setError(null);
    try {
      await apiDelete(`/promotions/${promotion.id}`);
      promotions.reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Сурталчилгаа"
        description="Хөнгөлөлтийн код, хугацаат урамшуулал"
        action={
          <Button variant="primary" onClick={() => setCreating(!creating)}>
            Урамшуулал нэмэх
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {creating ? (
        <CreatePromotionPanel
          onDone={() => {
            setCreating(false);
            promotions.reload();
          }}
        />
      ) : null}

      <Panel>
        <PanelHeader title="Урамшуулал" meta={`${rows.length} бүртгэл`} />
        {promotions.loading ? (
          <Loading />
        ) : promotions.error ? (
          <div className="p-4">
            <ErrorNote text={promotions.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Урамшуулал бүртгэгдээгүй байна" />
        ) : (
          <Table head={["Код", "Гарчиг", "Хөнгөлөлт", "Хугацаа", "Төлөв", ""]}>
            {rows.map((promotion) => (
              <Row key={promotion.id}>
                <Cell>
                  <span className="font-mono text-[12.5px] text-fg">
                    {promotion.code}
                  </span>
                </Cell>
                <Cell>
                  <div className="text-fg">{promotion.title}</div>
                  {promotion.description ? (
                    <div className="max-w-xs text-[12px] text-mute-dim">
                      {promotion.description}
                    </div>
                  ) : null}
                </Cell>
                <Cell align="right">
                  {promotion.percentOff !== null ? (
                    <span className="text-brand-hi">{promotion.percentOff}%</span>
                  ) : promotion.amountOff !== null ? (
                    <span className="text-brand-hi">
                      {formatPrice(promotion.amountOff)}
                    </span>
                  ) : (
                    <span className="text-mute-dim">—</span>
                  )}
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {formatDate(promotion.startsAt)} — {formatDate(promotion.endsAt)}
                  </span>
                </Cell>
                <Cell>
                  <Badge tone={promotion.active ? "ok" : "neutral"}>
                    {promotion.active ? "Идэвхтэй" : "Идэвхгүй"}
                  </Badge>
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      disabled={busy === promotion.id}
                      onClick={() => toggle(promotion)}
                    >
                      {promotion.active ? "Унтраах" : "Асаах"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(promotion)}>
                      Устгах
                    </Button>
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

/** Шинэ хөнгөлөлтийн код үүсгэх */
function CreatePromotionPanel({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    percentOff: "",
    amountOff: "",
    startsAt: today(),
    endsAt: today(),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      setError("Код болон гарчгийг бөглөнө үү");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/promotions", {
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        percentOff: form.percentOff ? Number(form.percentOff) : undefined,
        amountOff: form.amountOff ? Number(form.amountOff) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      onDone();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="mb-4">
      <PanelHeader title="Шинэ урамшуулал" />
      <form onSubmit={submit} className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Код">
            <Input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="BARILGA10"
            />
          </Field>
          <Field label="Гарчиг">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Тайлбар">
            <Input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Хувиар (%)">
            <Input
              value={form.percentOff}
              onChange={(event) => setForm({ ...form, percentOff: event.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="Дүнгээр (₮)">
            <Input
              value={form.amountOff}
              onChange={(event) => setForm({ ...form, amountOff: event.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="Эхлэх">
            <Input
              type="date"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            />
          </Field>
          <Field label="Дуусах">
            <Input
              type="date"
              value={form.endsAt}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            />
          </Field>
        </div>

        {error ? <ErrorNote text={error} /> : null}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Хадгалж байна…" : "Үүсгэх"}
          </Button>
          <Button onClick={onDone}>Болих</Button>
        </div>
      </form>
    </Panel>
  );
}
