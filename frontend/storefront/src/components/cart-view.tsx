"use client";

import Link from "next/link";
import {
  formatNumber,
  formatPrice,
  formatVolume,
  formatWeight,
} from "@/lib/format";
import {
  lineTotal,
  lineUnitPrice,
  useCart,
  type SupplierGroup,
} from "./cart-context";
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
  WeightIcon,
} from "./icons";
import { ProductThumb } from "./product-art";
import { SiteHeader } from "./site-header";
import { VehicleArt } from "./vehicle-art";
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
    weightKg,
    weightLabel,
    volumeM3,
    volumeLabel,
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
                      <span className="font-semibold text-[#c6ccd4]">
                        {group.deliveryPrice === 0
                          ? "үнэгүй"
                          : formatPrice(group.deliveryPrice)}
                      </span>
                    </span>
                    {group.deliveryDays ? (
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {group.deliveryDays} хоногт
                      </span>
                    ) : null}
                    {group.weightKg > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <WeightIcon className="h-3.5 w-3.5" />
                        Ачаа{" "}
                        <span className="font-semibold text-[#c6ccd4]">
                          {group.weightEstimated ? "~" : ""}
                          {formatWeight(group.weightKg)}
                        </span>
                        <span className="text-mute-dim">·</span>
                        <span className="font-semibold text-[#c6ccd4]">
                          {group.weightEstimated ? "~" : ""}
                          {formatVolume(group.volumeM3)}
                        </span>
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
                            <ProductThumb
                              image={line.image}
                              art={line.art}
                              name={line.productName}
                            />
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
                            {line.lineWeightKg ? (
                              <p
                                className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-mute-dim"
                                title={
                                  line.weightEstimated
                                    ? "Жин нь ангиллаар таамагласан ойролцоо утга"
                                    : "Нийлүүлэгчийн оруулсан жин"
                                }
                              >
                                <WeightIcon className="h-3.5 w-3.5" />
                                {line.weightEstimated ? "~" : ""}
                                {formatWeight(line.unitWeightKg ?? 0)} /{" "}
                                {line.unit} × {line.qty} ={" "}
                                <span className="font-semibold text-[#c6ccd4]">
                                  {line.weightEstimated ? "~" : ""}
                                  {formatWeight(line.lineWeightKg)}
                                </span>
                                {line.lineVolumeM3 ? (
                                  <>
                                    <span className="text-mute-dim">·</span>
                                    овор{" "}
                                    <span className="font-semibold text-[#c6ccd4]">
                                      {line.weightEstimated ? "~" : ""}
                                      {formatVolume(line.lineVolumeM3)}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                            ) : null}
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

                  <VehiclePicker group={group} />

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
                        Хүргэлт ({groups.length} машин)
                      </dt>
                      <dd className="font-medium text-white">
                        {deliveryTotal === 0
                          ? "Үнэгүй"
                          : formatPrice(deliveryTotal)}
                      </dd>
                    </div>
                    {weightKg > 0 ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <dt className="text-mute">Ачааны жин</dt>
                          <dd className="font-medium text-white">
                            {weightLabel}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="text-mute">Ачааны овор</dt>
                          <dd className="font-medium text-white">
                            {volumeLabel || formatVolume(volumeM3)}
                          </dd>
                        </div>
                      </>
                    ) : null}
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

/**
 * Хүргэлтийн машины сонголт.
 *
 * Сервер ачааны жингээр багтах хамгийн жижиг машиныг санал болгодог
 * (`common/logistics`). Гэхдээ хашааны хаалга нарийн, кран хэрэгтэй гэх
 * мэт шалтгаанаар худалдан авагч өөр машин авах хэрэгцээ гардаг тул
 * багтах бүх машинаас сонгох боломжийг энд өгнө. Багтахгүй машиныг
 * сонгуулахгүй ч даац нь хүрэхгүйг нь харуулна.
 */
function VehiclePicker({ group }: { group: SupplierGroup }) {
  const { vehicles, vehicleFor, setVehicle, shipments } = useCart();
  const plan = shipments[group.supplierId];
  const selected = vehicleFor(group.supplierId);

  if (group.weightKg <= 0 || vehicles.length === 0) return null;

  const recommended = plan?.vehicle ?? null;

  return (
    <section className="border-t border-ink-700 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[12.5px] font-semibold text-white">
          Хүргэлтийн машин
        </h3>
        <p className="text-[11.5px] text-mute-dim">
          {group.weightEstimated ? "~" : ""}
          {formatWeight(group.weightKg)} · {group.weightEstimated ? "~" : ""}
          {formatVolume(group.volumeM3)} ачаанд тохирохыг сонгоно уу
        </p>
      </div>

      <ul
        role="radiogroup"
        aria-label={`${group.supplierName} — хүргэлтийн машин`}
        className="mt-2.5 grid gap-2 sm:grid-cols-3 xl:grid-cols-5"
      >
        {vehicles.map((vehicle) => {
          // Жин ба овор хоёул багтаж байж л нэг ачилтаар явна
          const fitsWeight = vehicle.capacityKg >= group.weightKg;
          const fitsVolume = vehicle.volumeM3 >= group.volumeM3;
          const fits = fitsWeight && fitsVolume;
          const isRecommended = vehicle.id === recommended?.id;
          const active = selected?.id === vehicle.id;
          // Ачилтын тоо нь зөвхөн хамгийн том машинд ч багтахгүй ачаанд
          // утгатай. Багтахгүй жижиг машиныг олон дахин явуулах нь илүү
          // үнэтэй тусдаг тул (1.1 т ачаанд Портер 2×25,000 = 50,000₮ нь
          // 3 тонны 45,000₮-өөс үнэтэй) тэднийг үнэтэй нь харуулахгүй.
          const trips = isRecommended
            ? (plan?.trips ?? 1)
            : Math.max(
                Math.ceil(group.weightKg / vehicle.capacityKg),
                Math.ceil(group.volumeM3 / vehicle.volumeM3),
              );
          const price = fits || isRecommended ? vehicle.price * trips : null;

          return (
            <li key={vehicle.id}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                // Багтахгүй машиныг сонгуулахгүй. Ачаа хамгийн том машинаас
                // ч хэтэрсэн үед санал болгосон нь өөрөө багтахгүй тул
                // түүнийг үлдээнэ
                disabled={!fits && !isRecommended}
                onClick={() => setVehicle(group.supplierId, vehicle.id)}
                className={`flex w-full flex-col items-stretch gap-1.5 rounded-md border p-2 text-left transition-colors ${
                  active
                    ? "border-brand bg-brand/10"
                    : fits
                      ? "border-ink-700 bg-ink-900 hover:border-mute-dim"
                      : "border-ink-800 bg-ink-900 opacity-45"
                }`}
              >
                <span className="block h-20 w-full overflow-hidden rounded">
                  <VehicleArt id={vehicle.id} name={vehicle.name} />
                </span>
                <span
                  className={`text-[12px] font-semibold ${
                    active ? "text-brand" : "text-white"
                  }`}
                >
                  {vehicle.name}
                </span>
                <span className="text-[11px] text-mute-dim">
                  Даац {formatWeight(vehicle.capacityKg)} ·{" "}
                  {formatVolume(vehicle.volumeM3)}
                </span>
                <span className="text-[10.5px] text-mute-dim">
                  Тэвш {vehicle.bed.lengthM}×{vehicle.bed.widthM}×
                  {vehicle.bed.heightM} м
                </span>
                <span
                  className={`text-[12px] font-bold ${
                    price === null
                      ? "text-mute-dim"
                      : active
                        ? "text-brand"
                        : "text-[#c6ccd4]"
                  }`}
                >
                  {price === null
                    ? fitsWeight
                      ? "Тэвш багадна"
                      : "Даац хүрэхгүй"
                    : formatPrice(price)}
                  {price !== null && trips > 1 ? (
                    <span className="ml-1 text-[10px] font-normal text-mute-dim">
                      ({trips} ачилт)
                    </span>
                  ) : null}
                </span>
                {isRecommended ? (
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ok">
                    Санал болгов
                  </span>
                ) : fits ? (
                  <span className="text-[10.5px] text-mute-dim">Багтана</span>
                ) : (
                  <span className="text-[10.5px] text-mute-dim">
                    {!fitsVolume && fitsWeight
                      ? "Овор багтахгүй"
                      : !fitsWeight && fitsVolume
                        ? "Жин хүрэхгүй"
                        : "Ачаа багтахгүй"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-900 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11.5px] text-mute">
            <TruckIcon className="h-3.5 w-3.5 text-brand" />
            {plan?.chosen ? "Таны сонгосон" : "Санал болгож буй"}:{" "}
            <span className="font-semibold text-[#c6ccd4]">
              {selected.name}
            </span>
            {plan && plan.trips > 1 ? ` · ${plan.trips} ачилт` : ""}
            {plan
              ? ` · ${plan.limitedBy === "volume" ? "овроор" : "жингээр"} тодорсон`
              : ""}
          </span>
          <span className="text-[12.5px] text-mute">
            Хүргэлт{" "}
            <span className="text-[14px] font-bold text-brand">
              {formatPrice(plan?.price ?? 0)}
            </span>
          </span>
        </div>
      ) : null}

      {group.weightEstimated ? (
        <p className="mt-1.5 text-[11px] text-mute-dim">
          Жин нь ангиллаар таамагласан ойролцоо утга — нийлүүлэгч жингээ
          оруулмагц машин ба үнэ нь тодорно.
        </p>
      ) : null}
    </section>
  );
}
