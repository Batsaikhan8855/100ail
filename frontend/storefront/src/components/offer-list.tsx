"use client";

import type { Offer } from "@/data/catalog";
import { formatNumber, formatPrice } from "@/lib/format";
import { CheckIcon, ClockIcon, PinIcon, StarIcon, TruckIcon } from "./icons";
import { Panel, PanelHeader } from "./ui";

const deliveryLabel = (offer: Offer) =>
  offer.deliveryPrice === 0
    ? "Үнэгүй"
    : offer.deliveryPrice
      ? formatPrice(offer.deliveryPrice)
      : "Тохиролцоно";

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-1.5 py-0.5 text-[10px] font-semibold text-ok">
      <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
      Баталгаажсан
    </span>
  );
}

export function Rating({ value, count }: { value?: number; count?: number }) {
  if (!value) return <span className="text-mute-dim">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
      <StarIcon className="h-3.5 w-3.5 text-brand" fill="currentColor" />
      <span className="font-semibold text-fg">{value.toFixed(1)}</span>
      {typeof count === "number" ? (
        <span className="text-mute-dim">({count})</span>
      ) : null}
    </span>
  );
}

/**
 * Нэг бүтээгдэхүүний доорх олон нийлүүлэгчийн саналын харьцуулалт
 * (архитектурын баримтын 4.1 ба 7-р хэсэг).
 */
export function OfferList({
  offers,
  selectedId,
  onSelect,
}: {
  offers: Offer[];
  selectedId: string;
  onSelect: (offerId: string) => void;
}) {
  const cheapest = offers.reduce((min, o) => (o.price < min.price ? o : min));

  return (
    <Panel>
      <PanelHeader
        title="Нийлүүлэгчийн саналууд"
        meta={`${offers.length} санал`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-700 text-[11px] uppercase tracking-wide text-mute-dim">
              <th className="px-4 py-2.5 font-semibold">Нийлүүлэгч</th>
              <th className="px-3 py-2.5 font-semibold">Нэгж үнэ</th>
              <th className="px-3 py-2.5 font-semibold">Бөөний үнэ</th>
              <th className="px-3 py-2.5 font-semibold">Үлдэгдэл</th>
              <th className="px-3 py-2.5 font-semibold">Агуулах</th>
              <th className="px-3 py-2.5 font-semibold">Хүргэлт</th>
              <th className="px-3 py-2.5 font-semibold">Үнэлгээ</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const active = offer.id === selectedId;
              return (
                <tr
                  key={offer.id}
                  onClick={() => onSelect(offer.id)}
                  className={`cursor-pointer border-b border-ink-700 align-middle transition-colors last:border-b-0 ${
                    active ? "bg-brand/[0.07]" : "hover:bg-ink-800"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`h-8 w-[3px] rounded-full ${
                          active ? "bg-brand" : "bg-transparent"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-fg">
                          {offer.supplier.name}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {offer.supplier.verified ? <VerifiedBadge /> : null}
                          {offer.id === cheapest.id ? (
                            <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                              Хамгийн хямд
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </span>
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-[15px] font-bold text-brand">
                    {formatPrice(offer.price)}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-[13px]">
                    {offer.bulkPrice ? (
                      <>
                        <span className="font-semibold text-fg">
                          {formatPrice(offer.bulkPrice)}
                        </span>
                        {offer.bulkMinQty ? (
                          <span className="mt-0.5 block text-[11px] text-mute-dim">
                            {formatNumber(offer.bulkMinQty)} {offer.unit}-с
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-mute-dim">—</span>
                    )}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-[12.5px] text-mute">
                    {formatNumber(offer.stock)} {offer.unit}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-[12.5px] text-mute">
                    <span className="flex items-center gap-1.5">
                      <PinIcon className="h-3.5 w-3.5 text-brand" />
                      {offer.location}
                    </span>
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-[12.5px]">
                    <span className="flex items-center gap-1.5 text-mute">
                      <TruckIcon className="h-3.5 w-3.5 text-mute" />
                      {deliveryLabel(offer)}
                    </span>
                    {offer.deliveryDays ? (
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mute-dim">
                        <ClockIcon className="h-3 w-3" />
                        {offer.deliveryDays} хоногт
                      </span>
                    ) : null}
                  </td>

                  <td className="px-3 py-3">
                    <Rating value={offer.rating} count={offer.reviewCount} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center justify-center rounded-md px-3.5 py-2 text-[12px] font-bold whitespace-nowrap uppercase tracking-wide transition-colors ${
                        active
                          ? "bg-brand text-on-brand"
                          : "border border-ink-600 text-mute"
                      }`}
                    >
                      {active ? "Сонгосон" : "Сонгох"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
