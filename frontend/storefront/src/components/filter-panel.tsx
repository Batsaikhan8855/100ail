"use client";

import { useState } from "react";
import type { FilterGroup } from "@/data/catalog";
import { formatNumber } from "@/lib/format";
import { Checkbox, Collapsible, Panel, PanelHeader } from "./ui";

export interface PriceRange {
  min: number;
  max: number;
}

export function FilterPanel({
  groups,
  range,
  selected,
  onToggle,
  onClearAll,
  price,
  onPriceChange,
  openGroups,
  onToggleGroup,
}: {
  /** Facet-ээс үүссэн шүүлтүүрийн бүлгүүд */
  groups: FilterGroup[];
  /** Каталогийн бодит үнийн хязгаар */
  range: PriceRange;
  selected: Record<string, Set<string>>;
  onToggle: (groupId: string, optionId: string) => void;
  onClearAll: () => void;
  price: PriceRange;
  onPriceChange: (next: PriceRange) => void;
  openGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
}) {
  // Ангиллын үнэ 200₮-өөс тэрбум₮ хүртэл тэлдэг (гар багажнаас цамхагт
  // кран хүртэл). Шугаман гулсуур дээр ийм хүрээг чирэх боломжгүй —
  // 1% нь арван сая₮ үсэрнэ. Тиймээс байрлалыг логарифмаар буулгана:
  // гулсуурын алхам бүр үнийг үржүүлнэ, хуваахгүй.
  const LOG_STEPS = 1000;
  const lo = Math.max(1, range.min);
  const hi = Math.max(lo + 1, range.max);
  const logLo = Math.log(lo);
  const logSpan = Math.log(hi) - logLo;

  /** Үнэ → гулсуурын байрлал (0–LOG_STEPS) */
  const toPos = (value: number) => {
    const clamped = Math.min(Math.max(value, lo), hi);
    return Math.round(((Math.log(clamped) - logLo) / logSpan) * LOG_STEPS);
  };
  /** Гулсуурын байрлал → үнэ, уншихад эвтэйхэн болгож дугуйруулна */
  const toValue = (pos: number) => {
    const raw = Math.exp(logLo + (pos / LOG_STEPS) * logSpan);
    if (pos >= LOG_STEPS) return range.max;
    if (pos <= 0) return range.min;
    const magnitude = Math.pow(
      10,
      Math.max(0, Math.floor(Math.log10(raw)) - 1),
    );
    return Math.round(raw / magnitude) * magnitude;
  };

  const leftPct = (toPos(price.min) / LOG_STEPS) * 100;
  const rightPct = (toPos(price.max) / LOG_STEPS) * 100;

  const clampMin = (value: number) => Math.min(value, price.max);
  const clampMax = (value: number) => Math.max(value, price.min);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Шүүлтүүр"
        action={
          <button
            type="button"
            onClick={onClearAll}
            className="shrink-0 text-xs text-mute underline-offset-2 transition-colors hover:text-brand hover:underline"
          >
            Бүгдийг арилгах
          </button>
        }
      />

      <Collapsible
        title="Үнийн хүрээ"
        open={openGroups.price ?? true}
        onToggle={() => onToggleGroup("price")}
      >
        <div className="flex items-center gap-2">
          <PriceInput
            label="Доод үнэ"
            value={price.min}
            onCommit={(v) =>
              onPriceChange({ ...price, min: clampMin(Math.max(v, range.min)) })
            }
          />
          <span aria-hidden className="text-mute-dim">
            —
          </span>
          <PriceInput
            label="Дээд үнэ"
            value={price.max}
            onCommit={(v) =>
              onPriceChange({ ...price, max: clampMax(Math.min(v, range.max)) })
            }
          />
        </div>

        <div className="relative mt-5 h-4">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-ink-700"
          />
          <span
            aria-hidden
            className="absolute top-1.5 h-1 rounded-full bg-brand"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />
          <input
            type="range"
            aria-label="Доод үнэ"
            min={0}
            max={LOG_STEPS}
            step={1}
            value={toPos(price.min)}
            onChange={(e) =>
              onPriceChange({
                ...price,
                min: clampMin(toValue(Number(e.target.value))),
              })
            }
            className="absolute inset-x-0 top-0 h-4 w-full"
          />
          <input
            type="range"
            aria-label="Дээд үнэ"
            min={0}
            max={LOG_STEPS}
            step={1}
            value={toPos(price.max)}
            onChange={(e) =>
              onPriceChange({
                ...price,
                max: clampMax(toValue(Number(e.target.value))),
              })
            }
            className="absolute inset-x-0 top-0 h-4 w-full"
          />
        </div>
      </Collapsible>

      {groups.map((group) => {
        const chosen = selected[group.id] ?? new Set<string>();
        return (
          <Collapsible
            key={group.id}
            title={group.title}
            open={openGroups[group.id] ?? true}
            onToggle={() => onToggleGroup(group.id)}
          >
            <div
              className={
                group.twoColumn ? "grid grid-cols-2 gap-x-2" : "flex flex-col"
              }
            >
              {group.options.map((option) => (
                <Checkbox
                  key={option.id}
                  id={`${group.id}-${option.id}`}
                  label={option.label}
                  count={option.count}
                  checked={chosen.has(option.id)}
                  compact={group.twoColumn}
                  onChange={() => onToggle(group.id, option.id)}
                />
              ))}
            </div>
            {group.expandable ? (
              <button
                type="button"
                className="mt-2 text-xs text-brand transition-opacity hover:opacity-80"
              >
                + Илүү харах
              </button>
            ) : null}
          </Collapsible>
        );
      })}
    </Panel>
  );
}

/**
 * Үнийн талбар.
 *
 * Урьд нь товчлуур дарах болгонд шүүлт илгээгдэж, талбар нь хэзээ ч
 * хоосон болдоггүй байсан тул одоогийн утгын ард шинэ орон залгагдаж
 * ("100" дээр "22" бичихэд "10022") байв. Одоо бичиж байх хугацаанд
 * дотоод төлөвт хадгалж, фокус алдах эсвэл Enter дарахад л илгээнэ.
 * Фокус авахад бүх текстийг сонгоно — бичихэд шууд солигдоно.
 */
function PriceInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const digits = draft.replace(/[^\d]/g, "");
    onCommit(digits ? Number(digits) : 0);
    setDraft(null);
  };

  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2.5 py-2 focus-within:border-ink-600">
      <span aria-hidden className="text-xs text-mute-dim">
        ₮
      </span>
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? formatNumber(value)}
        onFocus={(e) => {
          setDraft(String(value));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          }
        }}
        className="w-full min-w-0 bg-transparent text-[13px] text-white outline-none"
      />
    </label>
  );
}
