"use client";

import { useState, type FormEvent } from "react";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { LocationPicker, MapView, mapsLink } from "@/components/map";
import {
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

interface Warehouse {
  id: string;
  name: string;
  city: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  skuCount: number;
  totalQuantity: number;
}

interface Draft {
  name: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

const EMPTY: Draft = { name: "", city: "", address: "", lat: null, lng: null };

export default function WarehousesPage() {
  const warehouses = useResource<Warehouse[]>("/warehouses/mine");
  /** null — форм хаалттай, "new" — шинэ, бусад — засаж буй агуулахын id */
  const [mode, setMode] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = warehouses.data ?? [];
  const mapped = rows.filter((row) => row.lat !== null && row.lng !== null);

  const openCreate = () => {
    setMode(mode === "new" ? null : "new");
    setDraft(EMPTY);
    setError(null);
  };

  const openEdit = (warehouse: Warehouse) => {
    setMode(warehouse.id);
    setDraft({
      name: warehouse.name,
      city: warehouse.city,
      address: warehouse.address ?? "",
      lat: warehouse.lat,
      lng: warehouse.lng,
    });
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.city.trim()) {
      setError("Нэр болон хот заавал бөглөнө");
      return;
    }

    setBusy(true);
    setError(null);
    const body = {
      name: draft.name.trim(),
      city: draft.city.trim(),
      address: draft.address.trim() || undefined,
      lat: draft.lat,
      lng: draft.lng,
    };

    try {
      if (mode === "new") await apiPost("/warehouses", body);
      else await apiPatch(`/warehouses/${mode}`, body);
      setMode(null);
      setDraft(EMPTY);
      warehouses.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (warehouse: Warehouse) => {
    if (!window.confirm(`"${warehouse.name}" агуулахыг устгах уу?`)) return;
    setError(null);
    try {
      await apiDelete(`/warehouses/${warehouse.id}`);
      warehouses.reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Агуулах"
        description="Салбар, агуулахын байршил. Газрын зураг дээрх байршлаар худалдан авагчид хамгийн ойрхон агуулахыг олно."
        action={
          <Button variant="primary" onClick={openCreate}>
            Агуулах нэмэх
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {mode ? (
        <Panel className="mb-4">
          <PanelHeader title={mode === "new" ? "Шинэ агуулах" : "Агуулах засах"} />
          <form onSubmit={submit} className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Нэр">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Төв агуулах"
                />
              </Field>
              <Field label="Хот, аймаг">
                <Input
                  value={draft.city}
                  onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                  placeholder="Улаанбаатар"
                />
              </Field>
              <Field label="Хаяг">
                <Input
                  value={draft.address}
                  onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                  placeholder="БЗД, 13-р хороо"
                />
              </Field>
            </div>

            <Field
              label="Газрын зураг дээрх байршил"
              hint="Хаягаа хайж сонгоно уу. Координатыг гараар ч оруулж болно."
            >
              <LocationPicker
                value={{ lat: draft.lat, lng: draft.lng }}
                defaultQuery={draft.address || draft.city}
                onChange={(point) =>
                  setDraft({
                    ...draft,
                    lat: point.lat,
                    lng: point.lng,
                    address: point.address ?? draft.address,
                  })
                }
              />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Хадгалж байна…" : "Хадгалах"}
              </Button>
              <Button onClick={() => setMode(null)}>Болих</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {mapped.length > 0 ? (
        <Panel className="mb-4">
          <PanelHeader
            title="Агуулахын байршил"
            meta={`${mapped.length} / ${rows.length} тэмдэглэгдсэн`}
          />
          <div className="p-4">
            <MapView
              points={mapped.map((row) => ({
                lat: row.lat as number,
                lng: row.lng as number,
                label: row.name,
              }))}
              height={260}
            />
          </div>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title="Агуулахууд" meta={`${rows.length} байршил`} />
        {warehouses.loading ? (
          <Loading />
        ) : warehouses.error ? (
          <div className="p-4">
            <ErrorNote text={warehouses.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Агуулах бүртгэгдээгүй байна" />
        ) : (
          <Table head={["Нэр", "Хот", "Хаяг", "Байршил", "SKU", "Нийт үлдэгдэл", ""]}>
            {rows.map((warehouse) => (
              <Row key={warehouse.id}>
                <Cell>
                  <span className="text-fg">{warehouse.name}</span>
                </Cell>
                <Cell>{warehouse.city}</Cell>
                <Cell>
                  <span className="text-mute">{warehouse.address ?? "—"}</span>
                </Cell>
                <Cell>
                  {warehouse.lat !== null && warehouse.lng !== null ? (
                    <a
                      href={mapsLink({ lat: warehouse.lat, lng: warehouse.lng })}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] text-brand hover:text-brand-hi"
                    >
                      {warehouse.lat.toFixed(4)}, {warehouse.lng.toFixed(4)}
                    </a>
                  ) : (
                    <span className="text-[12px] text-mute-dim">Тэмдэглээгүй</span>
                  )}
                </Cell>
                <Cell align="right">{warehouse.skuCount}</Cell>
                <Cell align="right">
                  <span className="tabular-nums text-fg">
                    {formatNumber(warehouse.totalQuantity)}
                  </span>
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" onClick={() => openEdit(warehouse)}>
                      Засах
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(warehouse)}>
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
