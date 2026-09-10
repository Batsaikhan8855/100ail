"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { SearchIcon, TruckIcon } from "./icons";
import { MapView } from "./map";
import { SiteHeader } from "./site-header";
import { Panel, PanelHeader } from "./ui";

interface Tracking {
  trackingCode: string;
  status: string;
  /** Ачааны байршил — GPS хүртэлх тооцоолсон утга */
  position: {
    current: { lat: number; lng: number };
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    progress: number;
    etaMinutes: number;
    estimated: true;
  } | null;
  city: string;
  address: string;
  driverName: string | null;
  driverPhone: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  supplier: string;
  orderCode: string;
  supplierOrderCode: string;
  items: { productName: string; qty: number; unit: string }[];
}

const STEPS = [
  { id: "PENDING", label: "Бүртгэгдсэн" },
  { id: "ASSIGNED", label: "Жолооч хуваарилсан" },
  { id: "IN_TRANSIT", label: "Замд яваа" },
  { id: "DELIVERED", label: "Хүргэгдсэн" },
];

export function TrackView() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [result, setResult] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const track = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await apiGet<Tracking>(`/deliveries/track/${value.trim()}`));
    } catch (cause) {
      setResult(null);
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Захиалгын хуудаснаас код дамжуулж ирвэл шууд хайна
  useEffect(() => {
    const initial = searchParams.get("code");
    if (initial) void track(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void track(code);
  };

  const activeStep = result
    ? STEPS.findIndex((step) => step.id === result.status)
    : -1;

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="track" />

      <main className="mx-auto max-w-[820px] px-4 py-6 xl:px-6">
        <Panel>
          <PanelHeader title="Хүргэлт хянах" meta="Хянах кодоор хайна" />
          <form onSubmit={submit} className="flex flex-wrap gap-2 px-4 py-4">
            <label className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-3 py-2.5">
              <SearchIcon className="h-[18px] w-[18px] shrink-0 text-mute-dim" />
              <span className="sr-only">Хянах код</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Жишээ: 100A-XXXXXX-1-D"
                className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-mute-dim"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-brand px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi disabled:opacity-60"
            >
              {busy ? "Хайж байна…" : "Хайх"}
            </button>
          </form>

          {error ? (
            <p className="border-t border-ink-700 px-4 py-4 text-[13px] text-[#f08585]">
              {error}
            </p>
          ) : null}
        </Panel>

        {result ? (
          <Panel className="mt-4">
            <PanelHeader
              title={`Хүргэлт ${result.trackingCode}`}
              meta={result.supplier}
            />

            <ol className="flex flex-wrap gap-3 px-4 py-4">
              {STEPS.map((step, index) => {
                const done = activeStep >= index;
                return (
                  <li key={step.id} className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                        done ? "bg-brand text-ink-950" : "bg-ink-800 text-mute"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`text-[12.5px] ${done ? "text-white" : "text-mute"}`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {result.position ? (
              <div className="border-t border-ink-700 px-4 py-4">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-white">
                    Ачаа хаана явж байна
                  </span>
                  <span className="text-[11.5px] text-mute-dim">
                    {result.position.progress >= 1
                      ? "Хүргэгдсэн"
                      : `Ойролцоогоор ${result.position.etaMinutes} минутын дараа`}
                  </span>
                </div>

                <MapView
                  points={[
                    {
                      lat: result.position.current.lat,
                      lng: result.position.current.lng,
                      label: "Ачаа",
                    },
                    {
                      lat: result.position.destination.lat,
                      lng: result.position.destination.lng,
                      label: "Хүргэх хаяг",
                    },
                  ]}
                  height={220}
                />

                {/* Замын явц */}
                <div className="mt-3">
                  <div className="relative h-1.5 rounded-full bg-ink-700">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all"
                      style={{
                        width: `${Math.round(result.position.progress * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-mute-dim">
                    <span>Агуулах</span>
                    <span>
                      {result.city}, {result.address}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] text-mute-dim">
                  Байршил нь замд гарсан хугацаагаар тооцоологдсон ойролцоо
                  утга. Жолоочийн GPS холбогдоход бодит цэг харагдана.
                </p>
              </div>
            ) : null}

            <div className="border-t border-ink-700 px-4 py-3.5 text-[12.5px] text-mute">
              <p className="flex items-center gap-1.5 text-[#c2c7cf]">
                <TruckIcon className="h-4 w-4 text-brand" />
                {result.city}, {result.address}
              </p>
              <p className="mt-1.5">
                Захиалга {result.orderCode} · дэд захиалга{" "}
                {result.supplierOrderCode}
              </p>
              {result.driverName ? (
                <p className="mt-1.5">
                  Жолооч: {result.driverName} · {result.driverPhone ?? "—"}
                </p>
              ) : null}
              {result.deliveredAt ? (
                <p className="mt-1.5">
                  Хүргэсэн:{" "}
                  {new Date(result.deliveredAt).toLocaleString("mn-MN")}
                </p>
              ) : result.dispatchedAt ? (
                <p className="mt-1.5">
                  Гарсан:{" "}
                  {new Date(result.dispatchedAt).toLocaleString("mn-MN")}
                </p>
              ) : null}
            </div>

            <ul className="border-t border-ink-700 px-4 py-3.5">
              {result.items.map((item) => (
                <li
                  key={item.productName}
                  className="flex justify-between gap-3 py-0.5 text-[12.5px] text-[#c2c7cf]"
                >
                  <span>{item.productName}</span>
                  <span className="text-mute">
                    {item.qty} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </main>
    </div>
  );
}
