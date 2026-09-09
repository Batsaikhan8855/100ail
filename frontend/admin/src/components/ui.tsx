"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { formatPrice } from "@/lib/format";
import type { Tone } from "@/lib/labels";

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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-4 py-3.5">
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
        <span className="h-4 w-[3px] rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {meta ? <span className="text-xs text-mute">{meta}</span> : null}
        {action}
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {description ? (
          <p className="mt-1 text-[13px] text-mute">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-ink-600 bg-ink-800 text-[#c2c7cf]",
  info: "border-[#2f5d8a] bg-[#16283a] text-[#7fb7ef]",
  warn: "border-brand-lo bg-brand/12 text-brand-hi",
  ok: "border-[#2b6b45] bg-[#14291d] text-ok",
  bad: "border-[#7a3030] bg-[#2c1717] text-[#f08585]",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  value,
  map,
}: {
  value: string;
  map: Record<string, { label: string; tone: Tone }>;
}) {
  const entry = map[value] ?? { label: value, tone: "neutral" as Tone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-mute">{label}</span>
        {icon ? <span className="text-mute-dim">{icon}</span> : null}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight text-white">
        {value}
      </div>
      {hint ? <div className="mt-1 text-[12px] text-mute-dim">{hint}</div> : null}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md";
};

export function Button({
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-9 px-3.5 text-[13px]",
  };
  const variants = {
    primary:
      "border-brand bg-brand text-ink-950 hover:bg-brand-hi hover:border-brand-hi",
    ghost: "border-ink-600 bg-ink-900 text-[#c2c7cf] hover:text-white hover:border-mute-dim",
    danger: "border-[#7a3030] bg-[#2c1717] text-[#f08585] hover:text-white",
    quiet: "border-transparent bg-transparent text-mute hover:text-white",
  };
  return (
    <button
      type="button"
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

const fieldClass =
  "w-full rounded-md border border-ink-600 bg-ink-900 px-3 text-[13px] text-white placeholder:text-mute-dim outline-none transition-colors focus:border-brand";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} h-9 ${className}`} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClass} h-9 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} py-2 ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-mute">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-mute-dim">{hint}</span> : null}
    </label>
  );
}

export function Table({
  head,
  children,
}: {
  head: ReactNode[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-ink-700 text-left text-[11.5px] uppercase tracking-wide text-mute-dim">
            {head.map((cell, index) => (
              <th key={index} className="px-4 py-2.5 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-ink-800 last:border-b-0 hover:bg-ink-800/50">
      {children}
    </tr>
  );
}

export function Cell({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignment =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return (
    <td className={`px-4 py-2.5 align-middle ${alignment} ${className}`}>
      {children}
    </td>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`tabular-nums text-white ${className}`}>
      {formatPrice(value)}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-10 text-center text-[13px] text-mute-dim">{text}</div>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-[#7a3030] bg-[#2c1717] px-3 py-2 text-[12.5px] text-[#f08585]">
      {text}
    </div>
  );
}

export function Loading({ text = "Ачаалж байна…" }: { text?: string }) {
  return <div className="px-4 py-10 text-center text-[13px] text-mute-dim">{text}</div>;
}

/** Өдөр тутмын борлуулалтын энгийн багана график */
export function BarChart({
  data,
  emptyText = "Мэдээлэл алга",
}: {
  data: { date: string; total: number }[];
  emptyText?: string;
}) {
  if (data.length === 0) return <EmptyState text={emptyText} />;
  const max = Math.max(...data.map((row) => row.total), 1);

  return (
    <div className="flex h-40 items-end gap-1 px-4 py-4">
      {data.map((row) => (
        <div
          key={row.date}
          className="group relative flex-1 rounded-t bg-brand/35 transition-colors hover:bg-brand"
          style={{ height: `${Math.max(3, (row.total / max) * 100)}%` }}
          title={`${row.date}: ${formatPrice(row.total)}`}
        >
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded border border-ink-600 bg-ink-900 px-1.5 py-0.5 text-[11px] text-white group-hover:block">
            {formatPrice(row.total)}
          </span>
        </div>
      ))}
    </div>
  );
}
