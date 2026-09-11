"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
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

type Placement = "HOME_HERO" | "HOME_STRIP" | "CATEGORY_TOP";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  placement: Placement;
  position: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
}

const PLACEMENT_LABEL: Record<Placement, string> = {
  HOME_HERO: "Нүүр — том баннер",
  HOME_STRIP: "Нүүр — зурвас",
  CATEGORY_TOP: "Ангиллын дээд хэсэг",
};

const today = () => new Date().toISOString().slice(0, 10);
const monthLater = () =>
  new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

export default function BannersPage() {
  const banners = useResource<Banner[]>("/banners/all");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = banners.data ?? [];

  const toggle = async (banner: Banner) => {
    setBusy(banner.id);
    setError(null);
    try {
      await apiPatch(`/banners/${banner.id}`, { active: !banner.active });
      banners.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (banner: Banner) => {
    if (!window.confirm(`"${banner.title}" баннерыг устгах уу?`)) return;
    setError(null);
    try {
      await apiDelete(`/banners/${banner.id}`);
      banners.reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Сурталчилгаа"
        description="Худалдан авагчийн нүүр хуудсанд харагдах баннер, харагдалт ба дарагдалтын тоо"
        action={
          <Button variant="primary" onClick={() => setCreating(!creating)}>
            Баннер нэмэх
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      {creating ? (
        <CreateBannerPanel
          onDone={() => {
            setCreating(false);
            banners.reload();
          }}
        />
      ) : null}

      <Panel>
        <PanelHeader title="Баннерууд" meta={`${rows.length} бүртгэл`} />
        {banners.loading ? (
          <Loading />
        ) : banners.error ? (
          <div className="p-4">
            <ErrorNote text={banners.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Баннер бүртгэгдээгүй байна" />
        ) : (
          <Table
            head={["Баннер", "Байрлал", "Хугацаа", "Харагдалт", "Дарсан", "CTR", "Төлөв", ""]}
          >
            {rows.map((banner) => (
              <Row key={banner.id}>
                <Cell>
                  <div className="flex items-center gap-3">
                    {banner.imageUrl ? (
                      // Гадаад S3 хаяг тул next/image-гүйгээр харуулна
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={banner.imageUrl}
                        alt=""
                        className="h-10 w-16 shrink-0 rounded border border-ink-700 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="truncate text-fg">{banner.title}</div>
                      {banner.subtitle ? (
                        <div className="max-w-xs truncate text-[12px] text-mute-dim">
                          {banner.subtitle}
                        </div>
                      ) : null}
                      {banner.linkUrl ? (
                        <div className="truncate text-[11.5px] text-brand">
                          {banner.linkUrl}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {PLACEMENT_LABEL[banner.placement]}
                  </span>
                </Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {formatDate(banner.startsAt)} — {formatDate(banner.endsAt)}
                  </span>
                </Cell>
                <Cell align="right">{formatNumber(banner.impressions)}</Cell>
                <Cell align="right">{formatNumber(banner.clicks)}</Cell>
                <Cell align="right">
                  <span className="text-brand-hi">{banner.ctr}%</span>
                </Cell>
                <Cell>
                  <Badge tone={banner.active ? "ok" : "neutral"}>
                    {banner.active ? "Идэвхтэй" : "Идэвхгүй"}
                  </Badge>
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      disabled={busy === banner.id}
                      onClick={() => toggle(banner)}
                    >
                      {banner.active ? "Унтраах" : "Асаах"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(banner)}>
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

/** Шинэ баннер: зургийг S3 руу presign-ээр шууд байршуулна */
function CreateBannerPanel({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    linkUrl: "",
    placement: "HOME_HERO" as Placement,
    position: "0",
    startsAt: today(),
    endsAt: monthLater(),
  });
  const [image, setImage] = useState<{ key: string; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const presign = await apiPost<{ key: string; uploadUrl: string; publicUrl: string }>(
        "/storage/presign",
        { contentType: file.type, fileName: file.name, folder: "banners" },
      );

      const response = await fetch(presign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!response.ok) throw new Error(`S3 байршуулалт амжилтгүй (${response.status})`);

      setImage({ key: presign.key, preview: presign.publicUrl });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Гарчгийг бөглөнө үү");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/banners", {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        imageKey: image?.key,
        placement: form.placement,
        position: Number(form.position) || 0,
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
      <PanelHeader title="Шинэ баннер" />
      <form onSubmit={submit} className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Гарчиг">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Барилгын улирал нээлттэй"
            />
          </Field>
          <Field label="Дэд гарчиг">
            <Input
              value={form.subtitle}
              onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Байрлал">
            <Select
              value={form.placement}
              onChange={(event) =>
                setForm({ ...form, placement: event.target.value as Placement })
              }
            >
              {Object.entries(PLACEMENT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Дараалал">
            <Input
              value={form.position}
              onChange={(event) => setForm({ ...form, position: event.target.value })}
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

        <Field label="Холбоос" hint="Жишээ: /?category=tsement">
          <Input
            value={form.linkUrl}
            onChange={(event) => setForm({ ...form, linkUrl: event.target.value })}
            placeholder="/?category=tsement"
          />
        </Field>

        <Field label="Зураг" hint="S3 тохируулаагүй үед зураггүй баннер ажиллана">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={upload}
              className="block cursor-pointer rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-[12.5px] text-mute file:mr-3 file:rounded file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:text-[12px] file:text-fg"
            />
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.preview}
                alt=""
                className="h-12 w-20 rounded border border-ink-700 object-cover"
              />
            ) : null}
          </div>
        </Field>

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
