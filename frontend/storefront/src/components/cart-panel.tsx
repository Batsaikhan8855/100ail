"use client";

import Link from "next/link";
import type { CartLine } from "@/data/catalog";
import { TRUST_ITEMS } from "@/data/catalog";
import { lineTotal, lineUnitPrice, useCart } from "./cart-context";
import { formatPrice } from "@/lib/format";
import {
  ArrowRightIcon,
  CartIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  TruckIcon,
  TRUST_ICONS,
} from "./icons";
import { Panel, PanelHeader } from "./ui";
import { ProductThumb } from "./product-art";

/**
 * Ачааны жин ба гарах машин.
 *
 * Барилгын материалын хувьд «ямар машин ирэх вэ» гэдэг нь худалдан
 * авагчийн хамгийн эхний асуулт (хашаанд багтах уу, кран хэрэгтэй юү).
 * Нийлүүлэгч тус бүр өөрийн ачаагаа зөөдөг тул машин нь бүлэг тутамд
 * сонгогдоно; энд нийт дүнг харуулна.
 */
function ShipmentSummary() {
  const { weightKg, weightLabel, shipments, vehicleFor } = useCart();
  if (weightKg <= 0) return null;

  const entries = Object.entries(shipments).filter(([, plan]) => plan.vehicle);
  if (entries.length === 0) return null;

  const plans = entries.map(([, plan]) => plan);
  const estimated = plans.some((plan) => plan.estimated);
  const trips = plans.reduce((sum, plan) => sum + plan.trips, 0);
  // Сагсны хуудсанд өөр машин сонгосон бол түүнийг нь харуулна
  const vehicles =
    entries.length === 1
      ? (vehicleFor(entries[0][0])?.name ?? "")
      : `${entries.length} машин`;

  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-3 py-2.5">
      <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0 text-[12px] leading-relaxed">
        <p className="text-[#c6ccd4]">
          Нийт жин{" "}
          <span className="font-semibold text-white">{weightLabel}</span>
          {" — "}
          <span className="font-semibold text-brand">{vehicles}</span>
          {trips > plans.length ? ` (${trips} ачилт)` : ""}
        </p>
        <p className="mt-0.5 text-[#c6ccd4]">
          Хүргэлт{" "}
          <span className="font-semibold text-white">
            {formatPrice(plans.reduce((sum, plan) => sum + plan.price, 0))}
          </span>
        </p>
        {estimated ? (
          <p className="mt-0.5 text-[11px] text-mute-dim">
            Жин нь ангиллаар таамагласан ойролцоо утга
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CartPanel({
  lines,
  onQtyChange,
  onRemove,
}: {
  lines: CartLine[];
  onQtyChange: (offerId: string, qty: number) => void;
  onRemove: (offerId: string) => void;
}) {
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  return (
    <Panel>
      <PanelHeader title="Таны сагс" meta={`${lines.length} бараа`} />

      <div className="divide-y divide-ink-700">
        {lines.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-mute">
            Сагс хоосон байна.
          </p>
        ) : (
          lines.map((line) => (
            <div
              key={line.offerId}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-ink-900 p-0.5">
                <ProductThumb
                  image={line.image}
                  art={line.art}
                  name={line.productName}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">
                  {line.productName}
                </p>
                <p className="truncate text-[11px] text-mute">
                  {line.supplierName}
                </p>
              </div>

              <span className="hidden w-[62px] shrink-0 text-right text-[13px] text-[#c6ccd4] sm:block">
                {formatPrice(lineUnitPrice(line))}
              </span>

              <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-ink-700 bg-ink-900">
                <button
                  type="button"
                  aria-label="Тоо хэмжээ хасах"
                  onClick={() => onQtyChange(line.offerId, line.qty - 1)}
                  className="flex h-7 w-7 items-center justify-center text-mute transition-colors hover:text-white"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  aria-label={`${line.productName} тоо хэмжээ`}
                  value={line.qty}
                  min={1}
                  onChange={(e) =>
                    onQtyChange(line.offerId, Number(e.target.value))
                  }
                  className="h-7 w-9 border-x border-ink-700 bg-transparent text-center text-[12.5px] text-white outline-none"
                />
                <button
                  type="button"
                  aria-label="Тоо хэмжээ нэмэх"
                  onClick={() => onQtyChange(line.offerId, line.qty + 1)}
                  className="flex h-7 w-7 items-center justify-center text-mute transition-colors hover:text-white"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="w-[74px] shrink-0 text-right text-[13px] font-semibold text-white">
                {formatPrice(line.unitPrice * line.qty)}
              </span>

              <button
                type="button"
                aria-label={`${line.productName} устгах`}
                onClick={() => onRemove(line.offerId)}
                className="shrink-0 text-mute-dim transition-colors hover:text-white"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-ink-700 px-4 py-3.5">
        <ShipmentSummary />

        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-[#c2c7cf]">Нийт дүн:</span>
          <span className="text-[22px] font-bold text-brand">
            {formatPrice(total)}
          </span>
        </div>

        {lines.length === 0 ? (
          <span className="mt-3 flex w-full items-center justify-center gap-3 rounded-md bg-brand px-4 py-3.5 text-[14px] font-bold uppercase tracking-wide text-ink-950 opacity-40">
            <CartIcon className="h-5 w-5" />
            Захиалга баталгаажуулах
            <ArrowRightIcon className="h-5 w-5" />
          </span>
        ) : (
          <Link
            href="/cart"
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-md bg-brand px-4 py-3.5 text-[14px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi"
          >
            <CartIcon className="h-5 w-5" />
            Захиалга баталгаажуулах
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        )}

        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => {
            const Icon = TRUST_ICONS[item.icon];
            return (
              <li key={item.id} className="flex items-center gap-2.5">
                <Icon className="h-[22px] w-[22px] shrink-0 text-mute" />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium text-white">
                    {item.title}
                  </span>
                  <span className="block truncate text-[11px] text-mute-dim">
                    {item.note}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
