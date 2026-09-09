"use client";

import Link from "next/link";
import { formatNumber, formatPrice } from "@/lib/format";
import { lineTotal, lineUnitPrice, useCart } from "./cart-context";
import {
  ArrowRightIcon,
  CartIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  MinusIcon,
  PinIcon,
  PlusIcon,
  TruckIcon,
} from "./icons";
import { ProductArt } from "./product-art";
import { SiteHeader } from "./site-header";
import { Panel, PanelHeader } from "./ui";

export function CartView() {
  const {
    groups,
    lines,
    goodsTotal,
    deliveryTotal,
    total,
    setQty,
    removeLine,
  } = useCart();

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="cart" />

      <main className="mx-auto max-w-[1660px] px-4 py-4 xl:px-6">
        <nav
          aria-label="Замын мөр"
          className="flex items-center gap-1.5 pb-3.5 text-[12.5px] text-mute"
        >
          <Link href="/" className="transition-colors hover:text-white">
            Нүүр
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 text-mute-dim" />
          <span className="text-white">Сагс</span>
        </nav>

        {lines.length === 0 ? (
          <Panel className="px-4 py-16 text-center">
            <CartIcon className="mx-auto h-10 w-10 text-mute-dim" />
            <p className="mt-3 text-[15px] font-semibold text-white">
              Сагс хоосон байна
            </p>
            <p className="mt-1 text-[13px] text-mute">
              Каталогоос бараа сонгож сагсандаа нэмнэ үү.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi"
            >
              Каталог руу буцах
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <Panel key={group.supplierId}>
                  <PanelHeader
                    title={group.supplierName}
                    meta={`${group.lines.length} бараа`}
                  />

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-ink-700 px-4 py-2.5 text-[11.5px] text-mute">
                    {group.location ? (
                      <span className="flex items-center gap-1.5">
                        <PinIcon className="h-3.5 w-3.5 text-brand" />
                        {group.location} агуулах
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5">
                      <TruckIcon className="h-3.5 w-3.5" />
                      Хүргэлт{" "}
                      {group.deliveryPrice === 0
                        ? "үнэгүй"
                        : formatPrice(group.deliveryPrice)}
                    </span>
                    {group.deliveryDays ? (
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {group.deliveryDays} хоногт
                      </span>
                    ) : null}
                  </div>

                  <ul className="divide-y divide-ink-700">
                    {group.lines.map((line) => {
                      const unit = lineUnitPrice(line);
                      const bulkActive = unit !== line.unitPrice;
                      return (
                        <li
                          key={line.offerId}
                          className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                        >
                          <Link
                            href={`/product/${line.productId}`}
                            className="h-14 w-14 shrink-0 overflow-hidden rounded bg-ink-900 p-1"
                          >
                            <ProductArt art={line.art} />
                          </Link>

                          <div className="min-w-[160px] flex-1">
                            <Link
                              href={`/product/${line.productId}`}
                              className="text-[13.5px] font-semibold text-white transition-colors hover:text-brand"
                            >
                              {line.productName}
                            </Link>
                            <p className="mt-0.5 text-[12px] text-mute">
                              {formatPrice(unit)} / {line.unit}
                              {bulkActive ? (
                                <span className="ml-1.5 text-ok">
                                  бөөний үнэ
                                </span>
                              ) : null}
                            </p>
                          </div>

                          <div className="flex items-center overflow-hidden rounded-md border border-ink-700 bg-ink-900">
                            <button
                              type="button"
                              aria-label={`${line.productName} тоо хэмжээ хасах`}
                              onClick={() => setQty(line.offerId, line.qty - 1)}
                              className="flex h-9 w-9 items-center justify-center text-mute transition-colors hover:text-white"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={line.qty}
                              aria-label={`${line.productName} тоо хэмжээ`}
                              onChange={(e) =>
                                setQty(line.offerId, Number(e.target.value))
                              }
                              className="h-9 w-14 border-x border-ink-700 bg-transparent text-center text-[13px] font-semibold text-white outline-none"
                            />
                            <button
                              type="button"
                              aria-label={`${line.productName} тоо хэмжээ нэмэх`}
                              onClick={() => setQty(line.offerId, line.qty + 1)}
                              className="flex h-9 w-9 items-center justify-center text-mute transition-colors hover:text-white"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>

                          <span className="w-[104px] shrink-0 text-right text-[14px] font-bold text-white">
                            {formatPrice(lineTotal(line))}
                          </span>

                          <button
                            type="button"
                            aria-label={`${line.productName} устгах`}
                            onClick={() => removeLine(line.offerId)}
                            className="shrink-0 text-mute-dim transition-colors hover:text-white"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex items-baseline justify-between border-t border-ink-700 px-4 py-3 text-[13px]">
                    <span className="text-mute">
                      {group.supplierName} дэд дүн
                    </span>
                    <span className="font-semibold text-white">
                      {formatPrice(group.total)}
                    </span>
                  </div>
                </Panel>
              ))}
            </div>

            <div className="xl:sticky xl:top-[152px]">
              <Panel>
                <PanelHeader
                  title="Захиалгын дүн"
                  meta={`${formatNumber(lines.length)} бараа`}
                />
                <div className="px-4 py-3.5">
                  <dl className="flex flex-col gap-2 text-[13px]">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-mute">Барааны дүн</dt>
                      <dd className="font-medium text-white">
                        {formatPrice(goodsTotal)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-mute">
                        Хүргэлт ({groups.length} нийлүүлэгч)
                      </dt>
                      <dd className="font-medium text-white">
                        {deliveryTotal === 0
                          ? "Үнэгүй"
                          : formatPrice(deliveryTotal)}
                      </dd>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between border-t border-ink-700 pt-3">
                      <dt className="text-[13px] text-[#c2c7cf]">Нийт дүн:</dt>
                      <dd className="text-[22px] font-bold text-brand">
                        {formatPrice(total)}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-[11.5px] leading-relaxed text-mute-dim">
                    Захиалга нийлүүлэгч тус бүрээр {groups.length} захиалга болж
                    хуваагдан, тус бүр өөрийн агуулахаас хүргэгдэнэ.
                  </p>

                  <Link
                    href="/checkout"
                    className="mt-3.5 flex w-full items-center justify-center gap-3 rounded-md bg-brand px-4 py-3.5 text-[14px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi"
                  >
                    Төлбөр рүү шилжих
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>

                  <Link
                    href="/"
                    className="mt-2 flex w-full items-center justify-center rounded-md border border-ink-600 px-4 py-3 text-[13px] font-semibold text-[#c2c7cf] transition-colors hover:border-brand hover:text-brand"
                  >
                    Худалдан авалтаа үргэлжлүүлэх
                  </Link>
                </div>
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
