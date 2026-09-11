"use client";

import { useMemo, useState, type FormEvent } from "react";
import { apiGet, apiDelete, apiPatch, apiPost } from "@/lib/api";
import { formatNumber } from "@/lib/format";
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
  Money,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  Select,
  Table,
  Textarea,
} from "@/components/ui";

interface MyOffer {
  id: string;
  price: number;
  bulkPrice: number | null;
  bulkMinQty: number | null;
  unit: string;
  deliveryPrice: number;
  deliveryDays: number | null;
  deliversTo: string[];
  active: boolean;
  stock: number;
  product: {
    id: string;
    slug: string;
    name: string;
    variantLabel: string | null;
    category: string;
  };
  warehouses: { warehouseId: string; name: string; city: string; quantity: number }[];
}

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  variantLabel: string | null;
}

interface CatalogResponse {
  items: CatalogProduct[];
}

interface EditState {
  price: string;
  bulkPrice: string;
  bulkMinQty: string;
  deliveryPrice: string;
  deliveryDays: string;
  deliversTo: string;
}

const toNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed.replace(/[\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export default function OffersPage() {
  const offers = useResource<MyOffer[]>("/offers/mine");
  const catalog = useResource<CatalogResponse>("/products?limit=100");

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "create" | "bulk" | "import">("none");

  const rows = offers.data ?? [];

  const startEdit = (offer: MyOffer) => {
    setEditing(offer.id);
    setError(null);
    setForm({
      price: String(offer.price),
      bulkPrice: offer.bulkPrice === null ? "" : String(offer.bulkPrice),
      bulkMinQty: offer.bulkMinQty === null ? "" : String(offer.bulkMinQty),
      deliveryPrice: String(offer.deliveryPrice),
      deliveryDays: offer.deliveryDays === null ? "" : String(offer.deliveryDays),
      deliversTo: offer.deliversTo.join(", "),
    });
  };

  const saveEdit = async (offerId: string) => {
    if (!form) return;
    const price = toNumber(form.price);
    if (price === null || price <= 0) {
      setError("Нэгж үнэ буруу байна");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/offers/${offerId}`, {
        price,
        bulkPrice: toNumber(form.bulkPrice),
        bulkMinQty: toNumber(form.bulkMinQty),
        deliveryPrice: toNumber(form.deliveryPrice) ?? 0,
        deliveryDays: toNumber(form.deliveryDays),
        deliversTo: form.deliversTo
          .split(",")
          .map((city) => city.trim())
          .filter(Boolean),
      });
      setEditing(null);
      setForm(null);
      offers.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (offer: MyOffer) => {
    setError(null);
    try {
      if (offer.active) await apiDelete(`/offers/${offer.id}`);
      else await apiPatch(`/offers/${offer.id}`, { active: true });
      offers.reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Бараа ба үнэ"
        description="Өөрийн саналын үнэ, бөөний нөхцөл, хүргэлтийн үнийг удирдана"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setMode(mode === "import" ? "none" : "import")}>
              Excel файл оруулах
            </Button>
            <Button onClick={() => setMode(mode === "bulk" ? "none" : "bulk")}>
              Хуулж наах
            </Button>
            <Button
              variant="primary"
              onClick={() => setMode(mode === "create" ? "none" : "create")}
            >
              Бараа нэмэх
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {mode === "create" ? (
        <CreateOfferPanel
          products={catalog.data?.items ?? []}
          onDone={() => {
            setMode("none");
            offers.reload();
          }}
        />
      ) : null}

      {mode === "import" ? (
        <ImportPanel
          onDone={() => {
            setMode("none");
            offers.reload();
          }}
        />
      ) : null}

      {mode === "bulk" ? (
        <BulkPricePanel
          offers={rows}
          onDone={() => {
            setMode("none");
            offers.reload();
          }}
        />
      ) : null}

      <Panel>
        <PanelHeader
          title="Миний саналууд"
          meta={`${formatNumber(rows.length)} бараа`}
        />
        {offers.loading ? (
          <Loading />
        ) : offers.error ? (
          <div className="p-4">
            <ErrorNote text={offers.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Одоогоор санал бүртгээгүй байна" />
        ) : (
          <Table
            head={[
              "Бараа",
              "Нэгж үнэ",
              "Бөөний үнэ",
              "Хүргэлт",
              "Үлдэгдэл",
              "Төлөв",
              "",
            ]}
          >
            {rows.map((offer) => {
              const isEditing = editing === offer.id && form !== null;
              return (
                <Row key={offer.id}>
                  <Cell>
                    <div className="text-fg">{offer.product.name}</div>
                    <div className="text-[12px] text-mute-dim">
                      {offer.product.variantLabel ?? offer.product.category}
                    </div>
                  </Cell>

                  {isEditing && form ? (
                    <>
                      <Cell>
                        <Input
                          value={form.price}
                          onChange={(event) =>
                            setForm({ ...form, price: event.target.value })
                          }
                          className="w-28"
                          inputMode="numeric"
                        />
                      </Cell>
                      <Cell>
                        <div className="flex gap-1">
                          <Input
                            value={form.bulkPrice}
                            onChange={(event) =>
                              setForm({ ...form, bulkPrice: event.target.value })
                            }
                            className="w-24"
                            placeholder="үнэ"
                            inputMode="numeric"
                          />
                          <Input
                            value={form.bulkMinQty}
                            onChange={(event) =>
                              setForm({ ...form, bulkMinQty: event.target.value })
                            }
                            className="w-20"
                            placeholder="доод"
                            inputMode="numeric"
                          />
                        </div>
                      </Cell>
                      <Cell>
                        <div className="flex gap-1">
                          <Input
                            value={form.deliveryPrice}
                            onChange={(event) =>
                              setForm({ ...form, deliveryPrice: event.target.value })
                            }
                            className="w-24"
                            placeholder="үнэ"
                            inputMode="numeric"
                          />
                          <Input
                            value={form.deliveryDays}
                            onChange={(event) =>
                              setForm({ ...form, deliveryDays: event.target.value })
                            }
                            className="w-16"
                            placeholder="хоног"
                            inputMode="numeric"
                          />
                        </div>
                      </Cell>
                      <Cell align="right">{formatNumber(offer.stock)}</Cell>
                      <Cell>
                        <Input
                          value={form.deliversTo}
                          onChange={(event) =>
                            setForm({ ...form, deliversTo: event.target.value })
                          }
                          className="w-36"
                          placeholder="Улаанбаатар, Дархан"
                        />
                      </Cell>
                      <Cell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busy}
                            onClick={() => saveEdit(offer.id)}
                          >
                            Хадгалах
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditing(null);
                              setForm(null);
                            }}
                          >
                            Болих
                          </Button>
                        </div>
                      </Cell>
                    </>
                  ) : (
                    <>
                      <Cell align="right">
                        <Money value={offer.price} />
                        <span className="text-mute-dim">/{offer.unit}</span>
                      </Cell>
                      <Cell align="right">
                        {offer.bulkPrice === null ? (
                          <span className="text-mute-dim">—</span>
                        ) : (
                          <>
                            <Money value={offer.bulkPrice} />
                            <div className="text-[11.5px] text-mute-dim">
                              {formatNumber(offer.bulkMinQty ?? 0)}
                              {offer.unit}-с
                            </div>
                          </>
                        )}
                      </Cell>
                      <Cell align="right">
                        {offer.deliveryPrice === 0 ? (
                          <span className="text-ok">Үнэгүй</span>
                        ) : (
                          <Money value={offer.deliveryPrice} />
                        )}
                        <div className="text-[11.5px] text-mute-dim">
                          {offer.deliveryDays === null
                            ? "—"
                            : `${offer.deliveryDays} хоног`}
                        </div>
                      </Cell>
                      <Cell align="right">
                        <span className="tabular-nums text-fg">
                          {formatNumber(offer.stock)}
                        </span>
                        <div className="text-[11.5px] text-mute-dim">
                          {offer.warehouses.length} агуулах
                        </div>
                      </Cell>
                      <Cell>
                        <Badge tone={offer.active ? "ok" : "neutral"}>
                          {offer.active ? "Идэвхтэй" : "Идэвхгүй"}
                        </Badge>
                      </Cell>
                      <Cell>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" onClick={() => startEdit(offer)}>
                            Засах
                          </Button>
                          <Button
                            size="sm"
                            variant={offer.active ? "danger" : "ghost"}
                            onClick={() => toggleActive(offer)}
                          >
                            {offer.active ? "Хаах" : "Нээх"}
                          </Button>
                        </div>
                      </Cell>
                    </>
                  )}
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>
    </>
  );
}

/** Каталогийн бүтээгдэхүүн дээр шинэ санал үүсгэх */
function CreateOfferPanel({
  products,
  onDone,
}: {
  products: CatalogProduct[];
  onDone: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("ш");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkMinQty, setBulkMinQty] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState("0");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [deliversTo, setDeliversTo] = useState("Улаанбаатар");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedPrice = toNumber(price);
    if (!productId || parsedPrice === null || parsedPrice <= 0) {
      setError("Бүтээгдэхүүн болон нэгж үнийг зөв оруулна уу");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/offers", {
        productId,
        price: parsedPrice,
        unit,
        bulkPrice: toNumber(bulkPrice),
        bulkMinQty: toNumber(bulkMinQty),
        deliveryPrice: toNumber(deliveryPrice) ?? 0,
        deliveryDays: toNumber(deliveryDays),
        deliversTo: deliversTo
          .split(",")
          .map((city) => city.trim())
          .filter(Boolean),
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
      <PanelHeader title="Шинэ санал" meta="Каталогийн бараан дээр үнээ оруулна" />
      <form onSubmit={submit} className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Бүтээгдэхүүн">
            <Select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">— сонгох —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.variantLabel ? ` (${product.variantLabel})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Хүргэх хот, аймаг" hint="Таслалаар тусгаарлана">
            <Input
              value={deliversTo}
              onChange={(event) => setDeliversTo(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Нэгж үнэ (₮)">
            <Input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Хэмжих нэгж">
            <Input value={unit} onChange={(event) => setUnit(event.target.value)} />
          </Field>
          <Field label="Бөөний үнэ (₮)">
            <Input
              value={bulkPrice}
              onChange={(event) => setBulkPrice(event.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Бөөний доод тоо">
            <Input
              value={bulkMinQty}
              onChange={(event) => setBulkMinQty(event.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Хүргэлтийн үнэ (₮)">
            <Input
              value={deliveryPrice}
              onChange={(event) => setDeliveryPrice(event.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Хүргэх хугацаа (хоног)">
            <Input
              value={deliveryDays}
              onChange={(event) => setDeliveryDays(event.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>

        {error ? <ErrorNote text={error} /> : null}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Хадгалж байна…" : "Санал үүсгэх"}
          </Button>
          <Button onClick={onDone}>Болих</Button>
        </div>
      </form>
    </Panel>
  );
}

/** Excel-ээс хуулсан мөрөөр үнийг бөөнөөр шинэчлэх */
function BulkPricePanel({
  offers,
  onDone,
}: {
  offers: MyOffer[];
  onDone: () => void;
}) {
  const template = useMemo(
    () =>
      offers
        .map(
          (offer) =>
            `${offer.id},${offer.price},${offer.bulkPrice ?? ""}\t# ${offer.product.name}`,
        )
        .join("\n"),
    [offers],
  );

  const [text, setText] = useState(template);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const rows = text
      .split("\n")
      .map((line) => line.split("\t")[0].trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const [offerId, price, bulkPrice] = line
          .split(",")
          .map((part) => part.trim());
        return {
          offerId: offerId ?? "",
          price: toNumber(price ?? "") ?? undefined,
          bulkPrice: toNumber(bulkPrice ?? ""),
        };
      })
      .filter((row) => row.offerId.length > 0);

    if (rows.length === 0) {
      setError("Шинэчлэх мөр олдсонгүй");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await apiPatch<{ updated: number }>("/offers/bulk-price", {
        rows,
      });
      setResult(`${response.updated} мөр шинэчлэгдлээ`);
      onDone();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="mb-4">
      <PanelHeader title="Бөөнөөр үнэ шинэчлэх" meta="offerId, нэгж үнэ, бөөний үнэ" />
      <div className="space-y-3 p-4">
        <p className="text-[12.5px] text-mute">
          Excel-ийн багануудыг{" "}
          <span className="text-fg">offerId, нэгж үнэ, бөөний үнэ</span>{" "}
          дарааллаар таслалаар тусгаарлан буулгана. Tab-ын ард бичсэн тайлбарыг
          тооцохгүй.
        </p>
        <Textarea
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="font-mono text-[12px]"
        />
        {error ? <ErrorNote text={error} /> : null}
        {result ? <div className="text-[12.5px] text-ok">{result}</div> : null}
        <div className="flex gap-2">
          <Button variant="primary" disabled={busy} onClick={submit}>
            {busy ? "Шинэчилж байна…" : "Шинэчлэх"}
          </Button>
          <Button onClick={onDone}>Хаах</Button>
        </div>
      </div>
    </Panel>
  );
}

interface ImportRow {
  row: number;
  product: string;
  action: "created" | "updated" | "skipped";
  reason?: string;
  price?: number;
  stock?: number;
  warehouse?: string;
}

interface ImportReport {
  total: number;
  created: number;
  updated: number;
  stockUpdated: number;
  skipped: number;
  dryRun: boolean;
  rows: ImportRow[];
}

const ACTION_LABEL: Record<ImportRow["action"], { label: string; tone: "ok" | "info" | "warn" }> = {
  created: { label: "Шинэ", tone: "ok" },
  updated: { label: "Шинэчлэх", tone: "info" },
  skipped: { label: "Алгассан", tone: "warn" },
};

/**
 * Excel (.xlsx) эсвэл CSV файлаас бараа, үнэ, үлдэгдлийг бөөнөөр
 * оруулах (баримтын 4.2). Эхлээд бичихгүйгээр урьдчилан харуулж,
 * баталгаажуулсны дараа хадгална.
 */
function ImportPanel({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [applied, setApplied] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (input: HTMLInputElement) => {
    const selected = input.files?.[0];
    if (!selected) return;

    setError(null);
    setPreview(null);
    setApplied(null);
    const content = await readBase64(selected);
    setFile({ name: selected.name, content });

    setBusy(true);
    try {
      setPreview(
        await apiPost<ImportReport>("/offers/import", {
          content,
          fileName: selected.name,
          dryRun: true,
        }),
      );
    } catch (cause) {
      setError((cause as Error).message);
      setFile(null);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const report = await apiPost<ImportReport>("/offers/import", {
        content: file.content,
        fileName: file.name,
      });
      setApplied(report);
      setPreview(null);
      onDone();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    setError(null);
    try {
      const template = await apiGet<{ fileName: string; content: string }>(
        "/offers/import/template",
      );
      // BOM нэмснээр Excel кирилл үсгийг зөв уншина
      const blob = new Blob(["\ufeff" + template.content], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const report = applied ?? preview;

  return (
    <Panel className="mb-4">
      <PanelHeader
        title="Excel-ээр бөөнөөр оруулах"
        meta=".xlsx, .csv"
        action={<Button size="sm" onClick={downloadTemplate}>Загвар татах</Button>}
      />
      <div className="space-y-3 p-4">
        <p className="text-[12.5px] text-mute">
          Багануудын гарчиг:{" "}
          <span className="text-fg">
            бараа, үнэ, бөөний үнэ, бөөний доод тоо, нэгж, хүргэлтийн үнэ, хүргэх
            хоног, агуулах, үлдэгдэл
          </span>
          . &quot;Бараа&quot; баганад бүтээгдэхүүний код (slug) эсвэл нэрийг бичнэ.
        </p>

        <input
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => void pick(event.currentTarget)}
          className="block w-full cursor-pointer rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-[12.5px] text-mute file:mr-3 file:rounded file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:text-[12px] file:text-fg"
        />

        {busy ? <div className="text-[12.5px] text-mute">Уншиж байна…</div> : null}
        {error ? <ErrorNote text={error} /> : null}

        {report ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[12.5px]">
              <Badge tone="info">Нийт {report.total}</Badge>
              <Badge tone="ok">Шинэ {report.created}</Badge>
              <Badge tone="info">Шинэчлэх {report.updated}</Badge>
              <Badge tone="neutral">Үлдэгдэл {report.stockUpdated}</Badge>
              <Badge tone={report.skipped > 0 ? "warn" : "neutral"}>
                Алгассан {report.skipped}
              </Badge>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-ink-700">
              <Table head={["Мөр", "Бараа", "Үйлдэл", "Үнэ", "Үлдэгдэл", "Тэмдэглэл"]}>
                {report.rows.map((row) => (
                  <Row key={row.row}>
                    <Cell>{row.row}</Cell>
                    <Cell>
                      <span className="text-fg">{row.product || "—"}</span>
                    </Cell>
                    <Cell>
                      <Badge tone={ACTION_LABEL[row.action].tone}>
                        {ACTION_LABEL[row.action].label}
                      </Badge>
                    </Cell>
                    <Cell align="right">
                      {row.price ? <Money value={row.price} /> : "—"}
                    </Cell>
                    <Cell align="right">
                      {row.stock !== undefined
                        ? `${formatNumber(row.stock)} (${row.warehouse})`
                        : "—"}
                    </Cell>
                    <Cell>
                      <span className="text-[12px] text-mute-dim">{row.reason ?? ""}</span>
                    </Cell>
                  </Row>
                ))}
              </Table>
            </div>

            {applied ? (
              <div className="text-[12.5px] text-ok">
                Импорт хийгдлээ: {applied.created} шинэ, {applied.updated} шинэчлэгдсэн.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          {preview && !applied ? (
            <Button variant="primary" disabled={busy} onClick={apply}>
              {busy ? "Хадгалж байна…" : `Баталгаажуулах (${preview.created + preview.updated})`}
            </Button>
          ) : null}
          <Button onClick={onDone}>Хаах</Button>
        </div>
      </div>
    </Panel>
  );
}

/** Файлыг base64 болгож API руу илгээхэд бэлдэнэ */
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Файлыг унших боломжгүй байна"));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}
