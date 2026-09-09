"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { BellIcon } from "./icons";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Уншаагүй мэдэгдлийг хэр давтамжтай шалгах вэ */
const POLL_MS = 45_000;

/**
 * Мэдэгдлийн хонх: захиалга, төлбөр, хүргэлт, татан авалтын мэдэгдлийг
 * харуулна. Мэдэгдэл нь API-д хадгалагдаж, имэйл/SMS суваг тохируулсан
 * үед давхар илгээгддэг (баримтын 5, 12.4-р хэсэг).
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const result = await apiGet<{ unread: number }>("/notifications/unread-count");
      setUnread(result.unread);
    } catch {
      // Нэвтрэлт дуусах, сүлжээ тасрахад хонх чимээгүй хэвээр байна
    }
  }, []);

  useEffect(() => {
    void loadCount();
    const timer = setInterval(() => void loadCount(), POLL_MS);
    return () => clearInterval(timer);
  }, [loadCount]);

  // Гадуур дарахад хаагдана
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;

    try {
      setItems(await apiGet<Notification[]>("/notifications"));
    } catch {
      setItems([]);
    }
  };

  const markAllRead = async () => {
    await apiPatch("/notifications/read-all").catch(() => undefined);
    setItems((rows) => rows?.map((row) => ({ ...row, read: true })) ?? rows);
    setUnread(0);
  };

  const openItem = async (item: Notification) => {
    if (!item.read) {
      await apiPatch(`/notifications/${item.id}/read`).catch(() => undefined);
      setUnread((count) => Math.max(0, count - 1));
      setItems((rows) =>
        rows?.map((row) => (row.id === item.id ? { ...row, read: true } : row)) ?? rows,
      );
    }
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Мэдэгдэл${unread > 0 ? `, ${unread} шинэ` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-ink-600 bg-ink-900 text-[#c2c7cf] transition-colors hover:border-mute-dim hover:text-white"
      >
        <BellIcon className="h-[18px] w-[18px]" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink-950">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-lg border border-ink-700 bg-ink-850 shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-700 px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-white">Мэдэгдэл</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11.5px] text-brand hover:text-brand-hi"
              >
                Бүгдийг уншсан болгох
              </button>
            ) : null}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items === null ? (
              <div className="px-3.5 py-8 text-center text-[12.5px] text-mute-dim">
                Ачаалж байна…
              </div>
            ) : items.length === 0 ? (
              <div className="px-3.5 py-8 text-center text-[12.5px] text-mute-dim">
                Мэдэгдэл алга байна
              </div>
            ) : (
              <ul className="divide-y divide-ink-800">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openItem(item)}
                      className={`w-full px-3.5 py-2.5 text-left transition-colors hover:bg-ink-800 ${
                        item.read ? "" : "bg-brand/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {item.read ? null : (
                          <span
                            aria-hidden
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-white">
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-[12px] leading-relaxed text-mute">
                            {item.body}
                          </div>
                          <div className="mt-1 text-[11px] text-mute-dim">
                            {formatDateTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
