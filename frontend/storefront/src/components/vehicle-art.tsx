"use client";

import type { Vehicle } from "./cart-context";

/**
 * Хүргэлтийн машины дүрслэл.
 *
 * Машин бүрд `public/vehicles/`-д хоёр зураг байна:
 * `<id>.jpg` — гэрэл зураг, `<id>-dimensions.jpg` — үйлдвэрийн
 * хэмжээсийн зураг. Хоёулаа `common/logistics`-ийн `VEHICLES` дэх
 * id-гаар нэрлэгдэнэ: porter, truck-3, truck-5, truck-10, truck-20.
 */

const photoSrc = (id: string) => `/vehicles/${id}.jpg`;

/** Үйлдвэрийн хэмжээсийн зургийн зам — «дэлгэрэнгүй» холбоост ч хэрэглэнэ */
export const dimensionsSrc = (id: string) => `/vehicles/${id}-dimensions.jpg`;

export function VehicleArt({ id, name }: { id: string; name?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoSrc(id)}
      alt={name ?? "Хүргэлтийн машин"}
      loading="lazy"
      className="h-full w-full rounded object-cover"
    />
  );
}

/** Үйлдвэрийн каталогийн хэмжээсийн зураг — дээрээс, урдаас, хажуугаас, араас */
export function VehicleDrawing({ vehicle }: { vehicle: Vehicle }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dimensionsSrc(vehicle.id)}
      alt={`${vehicle.name} — үйлдвэрийн хэмжээсийн зураг`}
      loading="lazy"
      className="w-full rounded bg-white object-contain"
    />
  );
}
