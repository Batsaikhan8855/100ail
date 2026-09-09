"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { apiDelete, apiPost } from "@/lib/api";
import { formatNumber, formatPrice } from "@/lib/format";
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
} from "@/components/ui";

interface ProductImage {
  id: string;
  key: string;
  url: string;
}

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  manufacturer: string | null;
  standard: string | null;
  category: { id: string; name: string; slug: string };
  offerCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  totalStock: number;
  rating: number | null;
  reviewCount: number;
  images: ProductImage[];
}

interface ProductsResponse {
  items: AdminProduct[];
  total: number;
}

interface Category {
  id: string;
  slug: string;
  name: string;
  children: { id: string; slug: string; name: string }[];
}

export default function AdminProductsPage() {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const products = useResource<ProductsResponse>(
    `/products?limit=100${category ? `&category=${category}` : ""}${
      query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""
    }`,
  );
  const categories = useResource<Category[]>("/categories");
  const searchStatus = useResource<{ meilisearch: boolean }>("/search/status");
  const [creating, setCreating] = useState(false);
  const [imagesFor, setImagesFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reindex = async () => {
    setError(null);
    try {
      const result = await apiPost<{ indexed: number }>("/search/reindex");
      setNotice(`Meilisearch индекс шинэчлэгдлээ: ${result.indexed} бүтээгдэхүүн`);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const rows = products.data?.items ?? [];
  const flatCategories = (categories.data ?? []).flatMap((parent) => [
    parent,
    ...parent.children.map((child) => ({ ...child, children: [] })),
  ]);

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`"${product.name}"-ийг каталогоос хаах уу?`)) return;
    setError(null);
    try {
      await apiDelete(`/products/${product.id}`);
      products.reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Бүтээгдэхүүн"
        description="Каталогийн үндсэн бүтээгдэхүүн. Үнэ, үлдэгдлийг нийлүүлэгч бүр өөрийн саналаар оруулна."
        action={
          <div className="flex gap-2">
            {searchStatus.data?.meilisearch ? (
              <Button onClick={reindex}>Индекс шинэчлэх</Button>
            ) : null}
            <Button variant="primary" onClick={() => setCreating(!creating)}>
              Бүтээгдэхүүн нэмэх
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {notice ? (
        <p className="mb-4 rounded-md border border-[#2b6b45] bg-[#14291d] px-3 py-2 text-[12.5px] text-ok">
          {notice}
        </p>
      ) : null}

      {creating ? (
        <CreateProductPanel
          categories={flatCategories}
          onDone={() => {
            setCreating(false);
            products.reload();
          }}
        />
      ) : null}

      <Panel>
        <PanelHeader
          title="Каталог"
          meta={`${formatNumber(products.data?.total ?? 0)} бүтээгдэхүүн`}
          action={
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Нэрээр хайх"
                className="w-44"
              />
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-48"
              >
                <option value="">Бүх ангилал</option>
                {flatCategories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {products.loading ? (
          <Loading />
        ) : products.error ? (
          <div className="p-4">
            <ErrorNote text={products.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Бүтээгдэхүүн олдсонгүй" />
        ) : (
          <Table
            head={["Бүтээгдэхүүн", "Ангилал", "Нийлүүлэгч", "Үнийн хязгаар", "Үлдэгдэл", "Үнэлгээ", ""]}
          >
            {rows.map((product) => (
              <Row key={product.id}>
                <Cell>
                  <div className="text-white">{product.name}</div>
                  <div className="text-[12px] text-mute-dim">
                    {product.manufacturer ?? product.slug}
                  </div>
                </Cell>
                <Cell>{product.category.name}</Cell>
                <Cell align="right">{product.offerCount}</Cell>
                <Cell align="right">
                  {product.minPrice === null ? (
                    <span className="text-mute-dim">—</span>
                  ) : (
                    <>
                      <Money value={product.minPrice} />
                      {product.maxPrice !== null &&
                      product.maxPrice !== product.minPrice ? (
                        <div className="text-[11.5px] text-mute-dim">
                          {formatPrice(product.maxPrice)} хүртэл
                        </div>
                      ) : null}
                    </>
                  )}
                </Cell>
                <Cell align="right">
                  {product.totalStock === 0 ? (
                    <Badge tone="bad">Дууссан</Badge>
                  ) : (
                    <span className="tabular-nums text-white">
                      {formatNumber(product.totalStock)}
                    </span>
                  )}
                </Cell>
                <Cell align="right">
                  {product.rating === null ? (
                    <span className="text-mute-dim">—</span>
                  ) : (
                    <>
                      <span className="text-white">{product.rating.toFixed(1)}</span>
                      <div className="text-[11.5px] text-mute-dim">
                        {product.reviewCount} сэтгэгдэл
                      </div>
                    </>
                  )}
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      onClick={() =>
                        setImagesFor(imagesFor === product.id ? null : product.id)
                      }
                    >
                      Зураг ({product.images.length})
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(product)}>
                      Хаах
                    </Button>
                  </div>
                  {imagesFor === product.id ? (
                    <ProductImages
                      product={product}
                      onChange={() => products.reload()}
                      onError={setError}
                    />
                  ) : null}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

/**
 * Барааны зураг: presign авч клиентээс шууд S3 руу байршуулаад
 * түлхүүрийг бүтээгдэхүүнд холбоно (баримтын 2-р хэсэг).
 */
function ProductImages({
  product,
  onChange,
  onError,
}: {
  product: AdminProduct;
  onChange: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const presign = await apiPost<{ key: string; uploadUrl: string }>(
        "/storage/presign",
        { contentType: file.type, fileName: file.name, folder: "products" },
      );

      const upload = await fetch(presign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!upload.ok) throw new Error(`S3 байршуулалт амжилтгүй (${upload.status})`);

      await apiPost(`/products/${product.id}/images`, { key: presign.key });
      onChange();
    } catch (cause) {
      onError((cause as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (imageId: string) => {
    try {
      await apiDelete(`/products/${product.id}/images/${imageId}`);
      onChange();
    } catch (cause) {
      onError((cause as Error).message);
    }
  };

  return (
    <div className="mt-2 w-64 rounded-md border border-ink-700 bg-ink-900 p-2.5">
      <div className="flex flex-wrap gap-2">
        {product.images.map((image) => (
          <span key={image.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className="h-14 w-14 rounded border border-ink-700 object-cover"
            />
            <button
              type="button"
              onClick={() => remove(image.id)}
              aria-label="Зураг устгах"
              className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border border-ink-600 bg-ink-950 text-[11px] text-[#f08585]"
            >
              ×
            </button>
          </span>
        ))}
        {product.images.length === 0 ? (
          <span className="text-[12px] text-mute-dim">Зураг алга</span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={upload}
        disabled={busy}
        className="mt-2 w-full text-[11.5px] text-mute file:mr-2 file:rounded file:border-0 file:bg-ink-700 file:px-2 file:py-1 file:text-[11.5px] file:text-white"
      />
      {busy ? (
        <p className="mt-1 text-[11.5px] text-mute">Байршуулж байна…</p>
      ) : null}
    </div>
  );
}

/** Каталогт шинэ бүтээгдэхүүн бүртгэх */
function CreateProductPanel({
  categories,
  onDone,
}: {
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    categoryId: "",
    variantLabel: "",
    manufacturer: "",
    standard: "",
    summary: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim() || !form.categoryId) {
      setError("Нэр, slug, ангилал заавал шаардлагатай");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/products", {
        name: form.name.trim(),
        slug: form.slug.trim(),
        categoryId: form.categoryId,
        variantLabel: form.variantLabel.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        standard: form.standard.trim() || undefined,
        summary: form.summary.trim() || undefined,
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
      <PanelHeader title="Шинэ бүтээгдэхүүн" />
      <form onSubmit={submit} className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Нэр">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Портланд цемент M400"
            />
          </Field>
          <Field label="Slug" hint="URL-д ашиглагдана">
            <Input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="portland-cement-m400"
            />
          </Field>
          <Field label="Ангилал">
            <Select
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            >
              <option value="">— сонгох —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Хувилбар">
            <Input
              value={form.variantLabel}
              onChange={(event) =>
                setForm({ ...form, variantLabel: event.target.value })
              }
              placeholder="50 кг"
            />
          </Field>
          <Field label="Үйлдвэрлэгч">
            <Input
              value={form.manufacturer}
              onChange={(event) =>
                setForm({ ...form, manufacturer: event.target.value })
              }
            />
          </Field>
          <Field label="Стандарт">
            <Input
              value={form.standard}
              onChange={(event) => setForm({ ...form, standard: event.target.value })}
              placeholder="MNS 0974:2008"
            />
          </Field>
        </div>

        <Field label="Товч тайлбар">
          <Input
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
          />
        </Field>

        {error ? <ErrorNote text={error} /> : null}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Хадгалж байна…" : "Бүртгэх"}
          </Button>
          <Button onClick={onDone}>Болих</Button>
        </div>
      </form>
    </Panel>
  );
}
