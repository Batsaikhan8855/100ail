"use client";

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

/** Тухайн цэгийн Google Maps дээрх холбоос */
export const mapsLink = (point: MapPoint): string =>
  `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;

/**
 * Агуулах, хүргэлтийн байршлын газрын зураг (баримтын 2-р хэсэг).
 *
 * `NEXT_PUBLIC_MAPBOX_TOKEN` байвал Mapbox статик зураг,
 * `NEXT_PUBLIC_GOOGLE_MAPS_KEY` байвал Google Maps embed, аль нь ч
 * байхгүй бол түлхүүр шаардахгүй OpenStreetMap харагдана.
 */
export function MapView({
  points,
  zoom = 12,
  height = 200,
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
  if (valid.length === 0) return null;

  const center = valid[0];

  if (MAPBOX_TOKEN) {
    const markers = valid
      .map((point) => `pin-s+f0a020(${point.lng},${point.lat})`)
      .join(",");
    return (
      // Статик зураг тул next/image-ийн оптимизаци шаардлагагүй
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${markers}/${center.lng},${center.lat},${zoom}/640x320@2x?access_token=${MAPBOX_TOKEN}`}
        alt={center.label ?? "Байршил"}
        className={`w-full rounded-md border border-ink-700 object-cover ${className}`}
        style={{ height }}
      />
    );
  }

  const span = 0.36 / Math.max(1, zoom - 8);
  const bbox = [
    center.lng - span,
    center.lat - span / 2,
    center.lng + span,
    center.lat + span / 2,
  ].join(",");

  const source = GOOGLE_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_KEY}&q=${center.lat},${center.lng}&zoom=${zoom}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`;

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
