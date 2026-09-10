import { DeliveryStatus } from "@prisma/client";

/**
 * Хүргэлтийн замын байршил.
 *
 * Жолоочийн утсанд GPS холбогдох хүртэл байршлыг агуулах болон
 * хүргэх хаягийн хооронд, зам гарсан хугацаагаар нь тооцно. Энэ нь
 * бодит биш ч хэрэглэгчид «ачаа хаана явж байна» гэдгийг харуулах
 * зорилгодоо нийцнэ; GPS холбогдоход зөвхөн энэ функцийг солино.
 */

/** Хотын доторх хүргэлт дунджаар хэдэн минут явдаг вэ */
const TRANSIT_MINUTES = 90;

/** Хотуудын төв цэг — хаяг тодорхойгүй үед нөөц байршил */
export const CITY_POINTS: Record<string, { lat: number; lng: number }> = {
  Улаанбаатар: { lat: 47.9186, lng: 106.9176 },
  Дархан: { lat: 49.4867, lng: 105.9228 },
  Эрдэнэт: { lat: 49.0347, lng: 104.0839 },
};

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface DeliveryPosition {
  /** Одоогийн байршил */
  current: RoutePoint;
  origin: RoutePoint;
  destination: RoutePoint;
  /** Замын явц, 0–1 */
  progress: number;
  /** Байршил нь тооцоолсон эсэх (GPS биш) */
  estimated: true;
  /** Үлдсэн хугацаа, минутаар. Хүргэгдсэн бол 0 */
  etaMinutes: number;
}

/** Хоёр цэгийн хооронд шугаман интерполяци */
const between = (a: RoutePoint, b: RoutePoint, t: number): RoutePoint => ({
  lat: Number((a.lat + (b.lat - a.lat) * t).toFixed(6)),
  lng: Number((a.lng + (b.lng - a.lng) * t).toFixed(6)),
});

export function deliveryPosition(delivery: {
  status: DeliveryStatus;
  dispatchedAt: Date | null;
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  city: string;
}): DeliveryPosition | null {
  const fallback = CITY_POINTS[delivery.city] ?? CITY_POINTS["Улаанбаатар"];
  const origin =
    delivery.originLat != null && delivery.originLng != null
      ? { lat: delivery.originLat, lng: delivery.originLng }
      : fallback;
  const destination =
    delivery.destLat != null && delivery.destLng != null
      ? { lat: delivery.destLat, lng: delivery.destLng }
      : fallback;

  // Эхлэх ба очих цэг ижил бол зураг дээр харуулах утгагүй
  if (origin.lat === destination.lat && origin.lng === destination.lng) {
    return null;
  }

  if (delivery.status === DeliveryStatus.DELIVERED) {
    return {
      current: destination,
      origin,
      destination,
      progress: 1,
      estimated: true,
      etaMinutes: 0,
    };
  }

  if (delivery.status !== DeliveryStatus.IN_TRANSIT || !delivery.dispatchedAt) {
    return {
      current: origin,
      origin,
      destination,
      progress: 0,
      estimated: true,
      etaMinutes: TRANSIT_MINUTES,
    };
  }

  const minutes = (Date.now() - delivery.dispatchedAt.getTime()) / 60_000;
  // Хүргэгдсэн гэж тэмдэглэх хүртэл 100% болгохгүй — хаалганы дэргэд зогсоно
  const progress = Math.min(0.94, Math.max(0, minutes / TRANSIT_MINUTES));

  return {
    current: between(origin, destination, progress),
    origin,
    destination,
    progress: Number(progress.toFixed(3)),
    estimated: true,
    etaMinutes: Math.max(1, Math.round(TRANSIT_MINUTES * (1 - progress))),
  };
}
