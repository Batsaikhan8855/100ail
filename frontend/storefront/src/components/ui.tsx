"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "./icons";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-ink-700 bg-ink-850 ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-4 py-3.5">
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-fg">
        <span className="h-4 w-[3px] rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      {meta ? (
        <span className="shrink-0 text-xs text-mute">{meta}</span>
      ) : null}
      {action}
    </header>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  count,
  id,
  compact = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
  id: string;
  /** Хоёр баганат шүүлтүүрт тоог нэрийн дараа шууд байрлуулна */
  compact?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`group flex cursor-pointer items-center gap-2 py-[5px] ${
        compact ? "text-[12px]" : "text-[12.5px]"
      }`}
    >
      <span className="relative flex h-[15px] w-[15px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-[3px] border border-ink-600 bg-ink-900 transition-colors peer-checked:border-brand peer-checked:bg-brand group-hover:border-mute-dim peer-checked:group-hover:border-brand"
        />
        <CheckIcon
          aria-hidden
          className="relative h-2.5 w-2.5 text-on-brand opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span
        className={`transition-colors ${compact ? "whitespace-nowrap" : "truncate"} ${
          checked ? "text-fg" : "text-mute group-hover:text-fg"
        }`}
      >
        {label}
      </span>
      {typeof count === "number" ? (
        <span
          className={`shrink-0 text-xs text-mute-dim ${compact ? "" : "ml-auto"}`}
        >
          ({count})
        </span>
      ) : null}
    </label>
  );
}

export function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-ink-700 px-4 py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[13px] font-semibold text-fg">{title}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-mute transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function IconButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-brand bg-brand/15 text-brand"
          : "border-ink-700 bg-ink-900 text-mute hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Захиалгын дугаар мэтийг нэг товшилтоор хуулна.
 *
 * `navigator.clipboard` нь зөвхөн найдвартай (https/localhost) орчинд
 * ажилладаг тул бусад тохиолдолд түр талбар үүсгэж хуулна.
 */
export function CopyButton({
  value,
  label = "Хуулах",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement("textarea");
        field.value = value;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label}: ${value}`}
      title={label}
      className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] transition-colors ${
        copied
          ? "border-ok/50 bg-ok/10 text-ok"
          : "border-ink-600 bg-ink-900 text-mute hover:text-fg"
      }`}
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
      {copied ? "Хуулсан" : "Хуулах"}
    </button>
  );
}
