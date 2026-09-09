"use client";

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
  const span = Math.max(1, range.max - range.min);
  const step = Math.max(1000, Math.round(span / 100 / 1000) * 1000);
  const leftPct = ((price.min - range.min) / span) * 100;
  const rightPct = ((price.max - range.min) / span) * 100;

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
            min={range.min}
            max={range.max}
            step={step}
            value={price.min}
            onChange={(e) =>
              onPriceChange({ ...price, min: clampMin(Number(e.target.value)) })
            }
            className="absolute inset-x-0 top-0 h-4 w-full"
          />
          <input
            type="range"
            aria-label="Дээд үнэ"
            min={range.min}
            max={range.max}
            step={step}
            value={price.max}
            onChange={(e) =>
              onPriceChange({ ...price, max: clampMax(Number(e.target.value)) })
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

function PriceInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2.5 py-2">
      <span aria-hidden className="text-xs text-mute-dim">
        ₮
      </span>
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatNumber(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          onCommit(digits ? Number(digits) : 0);
        }}
        className="w-full min-w-0 bg-transparent text-[13px] text-white outline-none"
      />
    </label>
  );
}
