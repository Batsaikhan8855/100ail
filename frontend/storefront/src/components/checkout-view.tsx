"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { lineTotal, useCart } from "./cart-context";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  PinIcon,
  ShieldIcon,
  TruckIcon,
} from "./icons";
import { MapView } from "./map";
import { SiteHeader } from "./site-header";
import { Panel, PanelHeader } from "./ui";

const CITIES = ["Улаанбаатар", "Дархан", "Эрдэнэт", "Орон нутаг"];

interface GeoPlace {
  name: string;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
}

const PAYMENT_METHODS = [
  {
    id: "QPAY",
    label: "QPay",
    note: "QR кодоор банкны аппаас төлнө",
  },
  {
    id: "CARD",
    label: "Банкны карт",
    note: "Банкны найдвартай хуудсанд шилжинэ",
  },
  {
    id: "TRANSFER",
    label: "Дансаар шилжүүлэх",
    note: "Нэхэмжлэх илгээгдэж, төлөгдсөний дараа баталгаажна",
  },
];

export function CheckoutView() {
  const router = useRouter();
  const { groups, goodsTotal, deliveryTotal, lines, reload } = useCart();
  const [pickup, setPickup] = useState(false);
  const [payment, setPayment] = useState("QPAY");
  const [isCompany, setIsCompany] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delivery = pickup ? 0 : deliveryTotal;
  const payable = goodsTotal + delivery;

  /**
   * Захиалгыг API үүсгэнэ: сагснаас нийлүүлэгч тус бүрийн дэд захиалга,
   * үлдэгдлийн нөөцлөлт, шимтгэлийн бүртгэл серверт хийгдэнэ.
   */
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();

    setBusy(true);
    setError(null);
    try {
      const order = await apiPost<{ code: string }>("/orders", {
        buyerName: value("name"),
        phone: value("phone"),
        city: value("city"),
        district: value("district") || undefined,
        address: value("address"),
        note: value("note") || undefined,
        deliveryMethod: pickup ? "PICKUP" : "DELIVERY",
        paymentMethod: payment,
        ...(isCompany
          ? { companyName: value("company"), companyRegNo: value("regno") }
          : {}),
      });

      await reload();
      router.push(`/orders/${order.code}`);
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="checkout" />

      <main className="mx-auto max-w-[1660px] px-4 py-4 xl:px-6">
        <nav
          aria-label="Замын мөр"
          className="flex items-center gap-1.5 pb-3.5 text-[12.5px] text-mute"
        >
          <Link href="/" className="transition-colors hover:text-fg">
            Нүүр
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 text-mute-dim" />
          <Link href="/cart" className="transition-colors hover:text-fg">
            Сагс
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 text-mute-dim" />
          <span className="text-fg">Төлбөр</span>
        </nav>

        {lines.length === 0 ? (
          <Panel className="px-4 py-16 text-center">
            <p className="text-[15px] font-semibold text-fg">
              Сагс хоосон байна
            </p>
            <p className="mt-1 text-[13px] text-mute">
              Захиалга үүсгэхийн тулд эхлээд бараа сонгоно уу.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hi"
            >
              Каталог руу буцах
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Panel>
        ) : (
          <form
            onSubmit={submit}
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start"
          >
            <div className="flex flex-col gap-4">
              <Panel>
                <PanelHeader title="Хүлээн авагчийн мэдээлэл" />
                <div className="grid gap-3.5 px-4 py-3.5 sm:grid-cols-2">
                  <Field label="Нэр" name="name" required />
                  <Field
                    label="Утасны дугаар"
                    name="phone"
                    type="tel"
                    placeholder="9911-2233"
                    required
                  />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] text-mute">Хот, аймаг</span>
                    <select
                      name="city"
                      defaultValue={CITIES[0]}
                      className="h-10 rounded-md border border-ink-700 bg-ink-900 px-3 text-[13.5px] text-fg outline-none focus:border-ink-600"
                    >
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Дүүрэг, сум" name="district" required />
                  <div className="sm:col-span-2">
                    <AddressField />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Нэмэлт тэмдэглэл"
                      name="note"
                      placeholder="Хүргэлтийн цаг, ачих нөхцөл гэх мэт"
                    />
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Хүргэлтийн хэлбэр" />
                <div className="flex flex-col gap-2.5 px-4 py-3.5">
                  <Choice
                    name="shipping"
                    checked={!pickup}
                    onChange={() => setPickup(false)}
                    title="Хаягаар хүргүүлэх"
                    note={
                      deliveryTotal === 0
                        ? "Үнэгүй хүргэлт"
                        : `Хүргэлтийн хураамж ${formatPrice(deliveryTotal)}`
                    }
                    icon={<TruckIcon className="h-[18px] w-[18px]" />}
                  />
                  <Choice
                    name="shipping"
                    checked={pickup}
                    onChange={() => setPickup(true)}
                    title="Агуулахаас өөрөө авах"
                    note="Нийлүүлэгч бүрийн агуулахаас очиж авна, хүргэлтийн хураамжгүй"
                    icon={<PinIcon className="h-[18px] w-[18px]" />}
                  />
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Төлбөрийн хэлбэр" />
                <div className="flex flex-col gap-2.5 px-4 py-3.5">
                  {PAYMENT_METHODS.map((method) => (
                    <Choice
                      key={method.id}
                      name="payment"
                      checked={payment === method.id}
                      onChange={() => setPayment(method.id)}
                      title={method.label}
                      note={method.note}
                      icon={<ShieldIcon className="h-[18px] w-[18px]" />}
                    />
                  ))}

                  <label className="mt-1.5 flex cursor-pointer items-center gap-2.5 border-t border-ink-700 pt-3.5 text-[13px] text-mute">
                    <input
                      type="checkbox"
                      checked={isCompany}
                      onChange={() => setIsCompany((v) => !v)}
                      className="h-4 w-4 accent-[#f5911e]"
                    />
                    Байгууллагын нэрээр нэхэмжлэх авах
                  </label>

                  {isCompany ? (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <Field label="Байгууллагын нэр" name="company" required />
                      <Field
                        label="Регистрийн дугаар"
                        name="regno"
                        placeholder="1234567"
                        required
                      />
                    </div>
                  ) : null}
                </div>
              </Panel>
            </div>

            <div className="flex flex-col gap-4 xl:sticky xl:top-[152px]">
              <Panel>
                <PanelHeader
                  title="Захиалгын хураангуй"
                  meta={`${groups.length} нийлүүлэгч`}
                />

                <ul className="divide-y divide-ink-700">
                  {groups.map((group) => (
                    <li key={group.supplierId} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-semibold text-fg">
                          {group.supplierName}
                        </span>
                        <span className="text-[13px] font-semibold text-fg">
                          {formatPrice(
                            group.goodsTotal +
                              (pickup ? 0 : group.deliveryPrice),
                          )}
                        </span>
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {group.lines.map((line) => (
                          <li
                            key={line.offerId}
                            className="flex items-baseline justify-between gap-3 text-[11.5px] text-mute"
                          >
                            <span className="truncate">
                              {line.productName} × {line.qty} {line.unit}
                            </span>
                            <span className="shrink-0 text-mute">
                              {formatPrice(lineTotal(line))}
                            </span>
                          </li>
                        ))}
                        <li className="flex items-baseline justify-between gap-3 text-[11.5px] text-mute">
                          <span>Хүргэлт</span>
                          <span className="text-mute">
                            {pickup || group.deliveryPrice === 0
                              ? "Үнэгүй"
                              : formatPrice(group.deliveryPrice)}
                          </span>
                        </li>
                      </ul>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-ink-700 px-4 py-3.5">
                  <dl className="flex flex-col gap-2 text-[13px]">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-mute">Барааны дүн</dt>
                      <dd className="font-medium text-fg">
                        {formatPrice(goodsTotal)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-mute">Хүргэлт</dt>
                      <dd className="font-medium text-fg">
                        {delivery === 0 ? "Үнэгүй" : formatPrice(delivery)}
                      </dd>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between border-t border-ink-700 pt-3">
                      <dt className="text-[13px] text-mute">Төлөх дүн:</dt>
                      <dd className="text-[22px] font-bold text-brand">
                        {formatPrice(payable)}
                      </dd>
                    </div>
                  </dl>

                  {error ? (
                    <p className="mt-3 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-3.5 flex w-full items-center justify-center gap-3 rounded-md bg-brand px-4 py-3.5 text-[14px] font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hi disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Илгээж байна…" : "Захиалга баталгаажуулах"}
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>

                  <p className="mt-3 text-[11.5px] leading-relaxed text-mute-dim">
                    Баталгаажуулснаар үйлчилгээний нөхцөлийг зөвшөөрч, захиалга
                    нийлүүлэгч тус бүрт илгээгдэнэ.
                  </p>
                </div>
              </Panel>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-mute">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="h-10 rounded-md border border-ink-700 bg-ink-900 px-3 text-[13.5px] text-fg outline-none placeholder:text-mute-dim focus:border-ink-600"
      />
    </label>
  );
}

function Choice({
  name,
  checked,
  onChange,
  title,
  note,
  icon,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 transition-colors ${
        checked
          ? "border-brand bg-brand/[0.07]"
          : "border-ink-700 bg-ink-900 hover:border-ink-600"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#f5911e]"
      />
      <span className={checked ? "text-brand" : "text-mute"}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-fg">
          {title}
        </span>
        <span className="block text-[11.5px] text-mute">{note}</span>
      </span>
    </label>
  );
}

/**
 * Хүргэлтийн хаяг: бичихийн хэрээр API-гийн `/geo/search`-ээр
 * (Mapbox эсвэл OpenStreetMap) санал болгож, сонгосон цэгийг газрын
 * зураг дээр харуулна (баримтын 2-р хэсэг "Байршил").
 */
function AddressField() {
  const [value, setValue] = useState("");
  const [places, setPlaces] = useState<GeoPlace[]>([]);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 3 || !open) {
      setPlaces([]);
      return;
    }

    let cancelled = false;
    // Товч дарах бүрд хүсэлт явуулахгүй
    const timer = setTimeout(() => {
      apiGet<GeoPlace[]>(`/geo/search?q=${encodeURIComponent(term)}&limit=5`)
        .then((result) => {
          if (!cancelled) setPlaces(result);
        })
        .catch(() => undefined);
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, open]);

  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="text-[12px] text-mute">
        Хаягийн дэлгэрэнгүй<span className="text-brand"> *</span>
      </span>
      <input
        name="address"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setPoint(null);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(true)}
        placeholder="Хороо, гудамж, байр, тоот"
        required
        autoComplete="off"
        className="h-10 rounded-md border border-ink-700 bg-ink-900 px-3 text-[13.5px] text-fg outline-none placeholder:text-mute-dim focus:border-ink-600"
      />

      {open && places.length > 0 ? (
        <ul className="absolute top-[62px] z-20 max-h-52 w-full overflow-y-auto rounded-md border border-ink-700 bg-ink-850 shadow-xl">
          {places.map((place) => (
            <li key={`${place.lat},${place.lng}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValue(place.address);
                  setPoint({ lat: place.lat, lng: place.lng });
                  setPlaces([]);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-[12.5px] text-mute hover:bg-ink-800 hover:text-fg"
              >
                <span className="block text-fg">{place.name}</span>
                <span className="block truncate text-[11.5px] text-mute-dim">
                  {place.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {point ? (
        <div className="mt-1.5">
          <MapView points={[point]} height={150} zoom={14} />
        </div>
      ) : null}
    </div>
  );
}
