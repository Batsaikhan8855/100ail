"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Button, Input } from "./ui";

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface GeoPlace {
  name: string;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

/** Тухайн цэгийн Google Maps дээрх холбоос */
export const mapsLink = (point: MapPoint): string =>
  `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;

/**
 * Агуулахын байршлын газрын зураг.
 *
 * Тохиргооноос хамаарч: `NEXT_PUBLIC_MAPBOX_TOKEN` байвал Mapbox-ийн
 * статик зураг (олон цэгийг нэг дор), `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
 * байвал Google Maps embed, аль нь ч байхгүй бол түлхүүр шаардахгүй
 * OpenStreetMap-ийн embed газрын зураг харагдана (баримтын 2-р хэсэг).
 */
export function MapView({
  points,
  zoom = 13,
  height = 220,
  className = "",
}: {
  points: MapPoint[];
  zoom?: number;
  height?: number;
  className?: string;
}) {
  const valid = points.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );

  if (valid.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-dashed border-ink-600 bg-ink-900 text-[12.5px] text-mute-dim ${className}`}
        style={{ height }}
      >
        Байршил тэмдэглээгүй байна
      </div>
    );
  }

  const center = valid[0];

  if (MAPBOX_TOKEN) {
    const markers = valid
      .map((point) => `pin-s+f0a020(${point.lng},${point.lat})`)
      .join(",");
    const source =
      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${markers}/` +
      `${center.lng},${center.lat},${zoom}/640x320@2x?access_token=${MAPBOX_TOKEN}`;
    return (
      // Статик зураг тул next/image-ийн оптимизаци шаардлагагүй
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt={center.label ?? "Байршил"}
        className={`w-full rounded-md border border-ink-700 object-cover ${className}`}
        style={{ height }}
      />
    );
  }

  const source = GOOGLE_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_KEY}&q=${center.lat},${center.lng}&zoom=${zoom}`
    : osmEmbed(center, zoom);

  return (
    <iframe
      title={center.label ?? "Байршил"}
      src={source}
      loading="lazy"
      className={`w-full rounded-md border border-ink-700 ${className}`}
      style={{ height }}
    />
  );
}

/** Түлхүүр шаардахгүй OpenStreetMap-ийн embed хаяг */
function osmEmbed(point: MapPoint, zoom: number): string {
  const span = 0.36 / Math.max(1, zoom - 8);
  const bbox = [
    point.lng - span,
    point.lat - span / 2,
    point.lng + span,
    point.lat + span / 2,
  ].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat},${point.lng}`;
}

/**
 * Хаягаар хайж байршил сонгох. Хайлт нь API-гийн `/geo/search`-ээр
 * (Mapbox эсвэл OpenStreetMap) явагдана; координатыг гараар ч оруулж болно.
 */
export function LocationPicker({
  value,
  onChange,
  defaultQuery = "",
}: {
  value: { lat: number | null; lng: number | null };
  onChange: (point: { lat: number | null; lng: number | null; address?: string }) => void;
  defaultQuery?: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<GeoPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => setQuery(defaultQuery), [defaultQuery]);

  const search = async () => {
    if (query.trim().length < 2) return;
    setBusy(true);
    setNote(null);
    try {
      const places = await apiGet<GeoPlace[]>(
        `/geo/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(places);
      if (places.length === 0) setNote("Илэрц олдсонгүй — координатыг гараар оруулж болно");
    } catch (cause) {
      setNote((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const point =
    value.lat !== null && value.lng !== null
      ? [{ lat: value.lat, lng: value.lng }]
      : [];

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          placeholder="Хаяг, барилга, дүүргээр хайх"
        />
        <Button onClick={search} disabled={busy}>
          {busy ? "Хайж байна…" : "Хайх"}
        </Button>
      </div>

      {results && results.length > 0 ? (
        <ul className="max-h-40 divide-y divide-ink-800 overflow-y-auto rounded-md border border-ink-700">
          {results.map((place) => (
            <li key={`${place.lat},${place.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ lat: place.lat, lng: place.lng, address: place.address });
                  setResults(null);
                  setNote(`Сонгосон: ${place.name}`);
                }}
                className="w-full px-3 py-2 text-left text-[12.5px] text-[#c2c7cf] hover:bg-ink-800 hover:text-white"
              >
                <span className="block text-white">{place.name}</span>
                <span className="block truncate text-[11.5px] text-mute-dim">
                  {place.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {note ? <p className="text-[11.5px] text-mute-dim">{note}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={value.lat ?? ""}
          onChange={(event) =>
            onChange({
              lat: event.target.value === "" ? null : Number(event.target.value),
              lng: value.lng,
            })
          }
          placeholder="Өргөрөг (lat)"
          inputMode="decimal"
        />
        <Input
          value={value.lng ?? ""}
          onChange={(event) =>
            onChange({
              lat: value.lat,
              lng: event.target.value === "" ? null : Number(event.target.value),
            })
          }
          placeholder="Уртраг (lng)"
          inputMode="decimal"
        />
      </div>

      <MapView points={point} height={180} />
    </div>
  );
}
