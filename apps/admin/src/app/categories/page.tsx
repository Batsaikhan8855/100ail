"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiDelete, apiPost } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { ATTRIBUTE_TYPE } from "@/lib/labels";
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
  Select,
  Table,
} from "@/components/ui";

interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  productCount: number;
  children: { id: string; slug: string; name: string; icon: string | null }[];
}

interface Attribute {
  id: string;
  key: string;
  label: string;
  unit: string | null;
  type: string;
  filterable: boolean;
  position: number;
}

export default function CategoriesPage() {
  const categories = useResource<Category[]>("/categories");
  const [selected, setSelected] = useState<Category | null>(null);
  const attributes = useResource<Attribute[]>(
    selected ? `/attributes/category/${selected.slug}` : null,
  );
  const [draft, setDraft] = useState({ key: "", label: "", unit: "", type: "TEXT" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Эхний ангиллыг автоматаар сонгоно
  useEffect(() => {
    if (!selected && categories.data && categories.data.length > 0) {
      setSelected(categories.data[0]);
    }
  }, [categories.data, selected]);

  const addAttribute = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (!draft.key.trim() || !draft.label.trim()) {
      setError("Түлхүүр болон нэрийг бөглөнө үү");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/attributes", {
        categoryId: selected.id,
        key: draft.key.trim(),
        label: draft.label.trim(),
        unit: draft.unit.trim() || undefined,
        type: draft.type,
      });
      setDraft({ key: "", label: "", unit: "", type: "TEXT" });
      attributes.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeAttribute = async (attribute: Attribute) => {
    if (!window.confirm(`"${attribute.label}" үзүүлэлтийг устгах уу?`)) return;
    setError(null);
    try {
      await apiDelete(`/attributes/${attribute.id}`);
      attributes.reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Ангилал ба үзүүлэлт"
        description="Ангилал бүрд техникийн үзүүлэлтийг уян хатан тодорхойлно. Шинэ үзүүлэлт нэмэхэд schema өөрчлөх шаардлагагүй."
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Panel>
          <PanelHeader
            title="Ангиллууд"
            meta={`${categories.data?.length ?? 0} үндсэн`}
          />
          {categories.loading ? (
            <Loading />
          ) : categories.error ? (
            <div className="p-4">
              <ErrorNote text={categories.error} />
            </div>
          ) : (
            <div className="p-2">
              {(categories.data ?? []).map((category) => (
                <div key={category.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(category)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                      selected?.id === category.id
                        ? "bg-brand/12 text-brand"
                        : "text-[#c2c7cf] hover:bg-ink-800 hover:text-white"
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className="text-[11.5px] text-mute-dim">
                      {formatNumber(category.productCount)}
                    </span>
                  </button>
                  {category.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() =>
                        setSelected({
                          ...child,
                          productCount: 0,
                          children: [],
                        })
                      }
                      className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-7 pr-3 text-left text-[12.5px] transition-colors ${
                        selected?.id === child.id
                          ? "text-brand"
                          : "text-mute hover:text-white"
                      }`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={selected ? `${selected.name} — үзүүлэлт` : "Үзүүлэлт"}
              meta={`${attributes.data?.length ?? 0} үзүүлэлт`}
            />
            {!selected ? (
              <EmptyState text="Ангилал сонгоно уу" />
            ) : attributes.loading ? (
              <Loading />
            ) : attributes.error ? (
              <div className="p-4">
                <ErrorNote text={attributes.error} />
              </div>
            ) : (attributes.data ?? []).length === 0 ? (
              <EmptyState text="Үзүүлэлт бүртгэгдээгүй байна" />
            ) : (
              <Table head={["Түлхүүр", "Нэр", "Нэгж", "Төрөл", "Шүүлтүүр", ""]}>
                {(attributes.data ?? []).map((attribute) => (
                  <Row key={attribute.id}>
                    <Cell>
                      <span className="font-mono text-[12.5px] text-mute">
                        {attribute.key}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="text-white">{attribute.label}</span>
                    </Cell>
                    <Cell>{attribute.unit ?? "—"}</Cell>
                    <Cell>{ATTRIBUTE_TYPE[attribute.type] ?? attribute.type}</Cell>
                    <Cell>
                      <Badge tone={attribute.filterable ? "ok" : "neutral"}>
                        {attribute.filterable ? "Шүүнэ" : "Шүүхгүй"}
                      </Badge>
                    </Cell>
                    <Cell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeAttribute(attribute)}
                        >
                          Устгах
                        </Button>
                      </div>
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Panel>

          {selected ? (
            <Panel>
              <PanelHeader title="Үзүүлэлт нэмэх" meta={selected.name} />
              <form onSubmit={addAttribute} className="space-y-3 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label="Түлхүүр" hint="Латинаар, жишээ: diameter">
                    <Input
                      value={draft.key}
                      onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                    />
                  </Field>
                  <Field label="Нэр">
                    <Input
                      value={draft.label}
                      onChange={(event) =>
                        setDraft({ ...draft, label: event.target.value })
                      }
                      placeholder="Диаметр"
                    />
                  </Field>
                  <Field label="Хэмжих нэгж">
                    <Input
                      value={draft.unit}
                      onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                      placeholder="мм"
                    />
                  </Field>
                  <Field label="Төрөл">
                    <Select
                      value={draft.type}
                      onChange={(event) => setDraft({ ...draft, type: event.target.value })}
                    >
                      {Object.entries(ATTRIBUTE_TYPE).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Button type="submit" variant="primary" disabled={busy}>
                  {busy ? "Нэмж байна…" : "Нэмэх"}
                </Button>
              </form>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
