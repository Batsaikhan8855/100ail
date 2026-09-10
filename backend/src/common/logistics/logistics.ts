/**
 * Ачааны жин ба хүргэлтийн машины ангилал.
 *
 * Барилгын материалын хүргэлтийг жингээр нь тодорхойлдог: 40 шуудай
 * цемент (2 тонн) жижиг машинд багтахгүй. Захиалгын нийт жингээс
 * хамааран ямар машин гарахыг энд тооцно.
 *
 * Жин нь эхлээд саналын `weightKg` (нийлүүлэгчийн оруулсан) утгаас,
 * байхгүй бол ангилал болон хэмжих нэгжээр таамагласан анхдагчаас
 * авагдана. Таамаглал бол ойролцоо утга — нийлүүлэгч жингээ оруулсан
 * даруйд тэр нь давамгайлна.
 */

/** Хүргэлтийн машины ангилал, даацаар нь эрэмбэлсэн */
export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
}

export const VEHICLES: Vehicle[] = [
  { id: "porter", name: "Портер", capacityKg: 1000 },
  { id: "truck-3", name: "3 тонны ачааны машин", capacityKg: 3000 },
  { id: "truck-5", name: "5 тонны ачааны машин", capacityKg: 5000 },
  { id: "truck-10", name: "10 тонны ачааны машин", capacityKg: 10_000 },
  { id: "truck-20", name: "20 тонны чиргүүл", capacityKg: 20_000 },
];

/**
 * Нэгж тутмын анхдагч жин (кг).
 *
 * Түлхүүр нь `<ангиллын дүрс>:<нэгж>`. Ангиллын дүрс нь импортын
 * `iconFor`-той нийцнэ (cement, brick, rebar, wood…). Тохирох утга
 * олдоогүй бол тухайн ангиллын `*` утга, эцэст нь ерөнхий анхдагч.
 */
const UNIT_WEIGHTS: Record<string, number> = {
  // Цемент, бетон
  "cement:ш": 50, // шуудай
  "cement:шуудай": 50,
  "cement:тн": 1000,
  "cement:м3": 2400, // бетон зуурмаг
  "cement:*": 50,

  // Тоосго, блок
  "brick:ш": 3.5,
  "brick:м2": 180,
  "brick:*": 3.5,

  // Арматур, төмөр
  "rebar:м": 0.888, // Ø12 дундаж
  "rebar:кг": 1,
  "rebar:тн": 1000,
  "rebar:ш": 10,
  "rebar:*": 1,

  // Модон материал
  "wood:м": 2.5,
  "wood:м2": 12,
  "wood:м3": 600,
  "wood:ш": 8,
  "wood:*": 8,

  // Дээвэр
  "roof:м2": 5,
  "roof:ш": 12,
  "roof:*": 8,

  // Дулаалга
  "insulation:м2": 1.5,
  "insulation:м3": 35,
  "insulation:ш": 6,
  "insulation:*": 4,

  // Сантехник
  "plumbing:м": 1.2,
  "plumbing:ш": 5,
  "plumbing:*": 4,

  // Цахилгаан
  "electric:м": 0.3,
  "electric:ш": 2,
  "electric:*": 1.5,

  // Будаг
  "paint:л": 1.4,
  "paint:кг": 1,
  "paint:ш": 15,
  "paint:*": 12,

  // Багаж
  "tools:ш": 6,
  "tools:*": 6,
};

/** Ангилал, нэгжээр таамагласан нэгж тутмын жин (кг) */
export function defaultUnitWeight(
  categoryIcon: string | null | undefined,
  unit: string | null | undefined,
): number {
  const icon = (categoryIcon ?? "tools").toLowerCase();
  const key = (unit ?? "ш").toLowerCase().trim();
  return UNIT_WEIGHTS[`${icon}:${key}`] ?? UNIT_WEIGHTS[`${icon}:*`] ?? 5;
}

/** Саналын нэгж тутмын жин: оруулсан утга байвал тэр, үгүй бол таамаг */
export function unitWeight(offer: {
  weightKg?: number | null;
  unit?: string | null;
  product?: { category?: { icon?: string | null } | null } | null;
}): number {
  if (offer.weightKg && offer.weightKg > 0) return offer.weightKg;
  return defaultUnitWeight(offer.product?.category?.icon, offer.unit);
}

export interface ShipmentPlan {
  /** Нийт жин, кг */
  totalKg: number;
  /** Сонгогдсон машин. Хоосон ачаанд null */
  vehicle: Vehicle | null;
  /** Хэдэн удаагийн ачилт шаардлагатай */
  trips: number;
  /** Жин нь нийлүүлэгчийн оруулсан утгад бүрэн тулгуурласан эсэх */
  estimated: boolean;
}

/**
 * Нийт жингээс хүргэлтийн төлөвлөгөө гаргана: багтах хамгийн жижиг
 * машиныг сонгож, хамгийн том машинаас хэтэрвэл ачилтын тоог бодно.
 */
export function planShipment(totalKg: number, estimated = false): ShipmentPlan {
  const kg = Math.max(0, Math.round(totalKg * 10) / 10);
  if (kg <= 0) return { totalKg: 0, vehicle: null, trips: 0, estimated };

  const fit = VEHICLES.find((vehicle) => kg <= vehicle.capacityKg);
  if (fit) return { totalKg: kg, vehicle: fit, trips: 1, estimated };

  // Хамгийн том машинаас хэтэрвэл олон удаа зөөнө
  const largest = VEHICLES[VEHICLES.length - 1];
  return {
    totalKg: kg,
    vehicle: largest,
    trips: Math.ceil(kg / largest.capacityKg),
    estimated,
  };
}

/** Жинг уншихад эвтэйхэн бичиглэл болгоно: 2,400 кг → "2.4 т" */
export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    const tonnes = kg / 1000;
    return `${tonnes >= 10 ? Math.round(tonnes) : Number(tonnes.toFixed(1))} т`;
  }
  return `${Math.round(kg * 10) / 10} кг`;
}
