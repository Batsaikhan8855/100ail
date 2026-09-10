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

/** Тэвшний дотор хэмжээ, метрээр */
export interface VehicleBed {
  lengthM: number;
  widthM: number;
  heightM: number;
}

/** Хүргэлтийн машины ангилал, даацаар нь эрэмбэлсэн */
export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
  /**
   * Тэвшний дотор хэмжээ. Хөнгөн ч овор ихтэй ачаа (дулаалгын хавтан,
   * хоолой) даацаас өмнө тэвшинд багтахаа болих тул машиныг зөвхөн
   * жингээр сонгож болохгүй.
   */
  bed: VehicleBed;
  /** Тэвшний эзэлхүүн, м³ (`bed`-ээс тооцоолсон) */
  volumeM3: number;
  /**
   * Улаанбаатар хот доторх нэг ачилтын үнэ (₮).
   *
   * Эдгээр нь зах зээлийн ойролцоо тариф — тээврийн хамтрагчтай гэрээ
   * байгуулсны дараа энэ хүснэгтийг солино. Хотоос гадуур явах, кран
   * хэрэгтэй зэрэг нэмэлт нөхцөлийг одоогоор тооцоогүй.
   */
  price: number;
}

/** Эзэлхүүнийг тэвшний хэмжээнээс бодож, нэг аравтын нарийвчлалд */
const bedVolume = (bed: VehicleBed): number =>
  Math.round(bed.lengthM * bed.widthM * bed.heightM * 10) / 10;

const vehicle = (
  id: string,
  name: string,
  capacityKg: number,
  price: number,
  bed: VehicleBed,
): Vehicle => ({ id, name, capacityKg, price, bed, volumeM3: bedVolume(bed) });

export const VEHICLES: Vehicle[] = [
  // Портер задгай тэвштэй тул өндрийг бодитоор нь (ачаа боох боломжтой
  // хэмжээгээр) авсан
  vehicle("porter", "Портер", 1000, 25_000, {
    lengthM: 2.5,
    widthM: 1.6,
    heightM: 1.0,
  }),
  vehicle("truck-3", "3 тонны ачааны машин", 3000, 45_000, {
    lengthM: 4.3,
    widthM: 2.0,
    heightM: 2.0,
  }),
  vehicle("truck-5", "5 тонны ачааны машин", 5000, 70_000, {
    lengthM: 5.5,
    widthM: 2.2,
    heightM: 2.2,
  }),
  vehicle("truck-10", "10 тонны ачааны машин", 10_000, 120_000, {
    lengthM: 7.5,
    widthM: 2.4,
    heightM: 2.5,
  }),
  vehicle("truck-20", "20 тонны чиргүүл", 20_000, 200_000, {
    lengthM: 13.6,
    widthM: 2.45,
    heightM: 2.7,
  }),
];

/** Ачааны хэмжээ — жин ба овор хоёулаа */
export interface Load {
  kg: number;
  m3: number;
}

/** Ачаа машинд нэг ачилтаар багтах эсэх — жин ба овор хоёул таарна */
export const fitsIn = (load: Load, v: Vehicle): boolean =>
  load.kg <= v.capacityKg && load.m3 <= v.volumeM3;

/**
 * Сонгосон машинаар хэдэн ачилт хийхийг бодно.
 *
 * Жин ба оврын аль хязгаарлагдмал нь ачилтын тоог тодорхойлно: 40 шоо
 * метр дулаалга нь хөнгөн ч 3 тонны машинд (17 м³) хоёр удаа л багтана.
 */
export const tripsFor = (load: Load, v: Vehicle): number => {
  if (load.kg <= 0 && load.m3 <= 0) return 0;
  return Math.max(
    1,
    Math.ceil(load.kg / v.capacityKg),
    Math.ceil(load.m3 / v.volumeM3),
  );
};

/** Ачилтыг жин нь тодорхойлж байна уу, овор нь уу */
export const limitedBy = (load: Load, v: Vehicle): "weight" | "volume" =>
  load.m3 / v.volumeM3 > load.kg / v.capacityKg ? "volume" : "weight";

/** Тухайн машинаар ачааг хүргэх нийт үнэ */
export const shipmentPrice = (load: Load, v: Vehicle): number =>
  v.price * tripsFor(load, v);

/** id-гаар машиныг олно */
export const vehicleById = (id: string | null | undefined): Vehicle | null =>
  VEHICLES.find((vehicle) => vehicle.id === id) ?? null;

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

/**
 * Нэгж тутмын анхдагч овор (м³), `UNIT_WEIGHTS`-тэй ижил түлхүүртэй.
 *
 * Ачилтын байдлаар (өрж тавьсан) авсан ойролцоо утга: 50 кг цементийн
 * шуудай ~0.035 м³, өрлөгийн тоосго ~0.002 м³, 50мм дулаалгын хавтан
 * м² тутамд ~0.05 м³. Нийлүүлэгч `volumeM3` оруулсан бол тэр давамгайлна.
 */
const UNIT_VOLUMES: Record<string, number> = {
  // Цемент, бетон
  "cement:ш": 0.035,
  "cement:шуудай": 0.035,
  "cement:тн": 0.7,
  "cement:м3": 1,
  "cement:*": 0.035,

  // Тоосго, блок
  "brick:ш": 0.002,
  "brick:м2": 0.12,
  "brick:*": 0.002,

  // Арматур, төмөр
  "rebar:м": 0.0002,
  "rebar:кг": 0.00013,
  "rebar:тн": 0.13,
  "rebar:ш": 0.002,
  "rebar:*": 0.0002,

  // Модон материал
  "wood:м": 0.006,
  "wood:м2": 0.02,
  "wood:м3": 1,
  "wood:ш": 0.02,
  "wood:*": 0.02,

  // Дээвэр
  "roof:м2": 0.01,
  "roof:ш": 0.04,
  "roof:*": 0.02,

  // Дулаалга — хөнгөн ч овор их
  "insulation:м2": 0.05,
  "insulation:м3": 1,
  "insulation:ш": 0.15,
  "insulation:*": 0.1,

  // Сантехник
  "plumbing:м": 0.005,
  "plumbing:ш": 0.02,
  "plumbing:*": 0.02,

  // Цахилгаан
  "electric:м": 0.0005,
  "electric:ш": 0.005,
  "electric:*": 0.005,

  // Будаг
  "paint:л": 0.0012,
  "paint:кг": 0.001,
  "paint:ш": 0.02,
  "paint:*": 0.015,

  // Багаж
  "tools:ш": 0.03,
  "tools:*": 0.03,
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

/** Ангилал, нэгжээр таамагласан нэгж тутмын овор (м³) */
export function defaultUnitVolume(
  categoryIcon: string | null | undefined,
  unit: string | null | undefined,
): number {
  const icon = (categoryIcon ?? "tools").toLowerCase();
  const key = (unit ?? "ш").toLowerCase().trim();
  return UNIT_VOLUMES[`${icon}:${key}`] ?? UNIT_VOLUMES[`${icon}:*`] ?? 0.03;
}

/** Саналын нэгж тутмын овор: оруулсан утга байвал тэр, үгүй бол таамаг */
export function unitVolume(offer: {
  volumeM3?: number | null;
  unit?: string | null;
  product?: { category?: { icon?: string | null } | null } | null;
}): number {
  if (offer.volumeM3 && offer.volumeM3 > 0) return offer.volumeM3;
  return defaultUnitVolume(offer.product?.category?.icon, offer.unit);
}

export interface ShipmentPlan {
  /** Нийт жин, кг */
  totalKg: number;
  /** Нийт овор, м³ */
  totalM3: number;
  /** Машиныг жин нь тодорхойлсон уу, овор нь уу */
  limitedBy: "weight" | "volume";
  /** Сонгогдсон машин. Хоосон ачаанд null */
  vehicle: Vehicle | null;
  /** Хэдэн удаагийн ачилт шаардлагатай */
  trips: number;
  /** Жин нь нийлүүлэгчийн оруулсан утгад бүрэн тулгуурласан эсэх */
  estimated: boolean;
  /** Тээврийн үнэ: машины тариф × ачилтын тоо */
  price: number;
  /** Худалдан авагч машинаа өөрөө сонгосон эсэх */
  chosen: boolean;
}

/**
 * Ачааны жин ба овроос хүргэлтийн төлөвлөгөө гаргана: хоёуланд нь багтах
 * хамгийн жижиг машиныг сонгож, хамгийн том машинаас хэтэрвэл ачилтын
 * тоог бодно.
 */
export function planShipment(
  load: Load,
  estimated = false,
  /** Худалдан авагчийн сонгосон машин — багтахгүй бол үл тоомсорлоно */
  preferred?: Vehicle | null,
): ShipmentPlan {
  const kg = Math.max(0, Math.round(load.kg * 10) / 10);
  const m3 = Math.max(0, Math.round(load.m3 * 100) / 100);
  if (kg <= 0 && m3 <= 0)
    return {
      totalKg: 0,
      totalM3: 0,
      limitedBy: "weight",
      vehicle: null,
      trips: 0,
      estimated,
      price: 0,
      chosen: false,
    };

  const actual: Load = { kg, m3 };
  // Жин ба овор хоёуланд нь багтах хамгийн жижиг машин — санал болгох нь
  const fit = VEHICLES.find((v) => fitsIn(actual, v));
  const fallback = fit ?? VEHICLES[VEHICLES.length - 1];

  // Сонгосон машин ачаанд багтаж байвал л хүндэтгэнэ. Багтахгүй машин
  // сонгосон хэвээр үлдвэл хүргэлт биелэхгүй үнэ харагдана.
  const chosen = preferred && fitsIn(actual, preferred) ? preferred : null;
  const vehicle = chosen ?? fallback;

  return {
    totalKg: kg,
    totalM3: m3,
    limitedBy: limitedBy(actual, vehicle),
    vehicle,
    trips: tripsFor(actual, vehicle),
    estimated,
    price: shipmentPrice(actual, vehicle),
    chosen: chosen !== null,
  };
}

/** Оврыг уншихад эвтэйхэн бичиглэл болгоно: 0.35 → "0.35 м³" */
export function formatVolume(m3: number): string {
  if (m3 >= 10) return `${Math.round(m3)} м³`;
  if (m3 >= 1) return `${Number(m3.toFixed(1))} м³`;
  return `${Number(m3.toFixed(2))} м³`;
}

/** Тэвшний хэмжээ: "4.3 × 2.0 × 2.0 м" */
export const formatBed = (bed: VehicleBed): string =>
  `${bed.lengthM} × ${bed.widthM} × ${bed.heightM} м`;

/** Жинг уншихад эвтэйхэн бичиглэл болгоно: 2,400 кг → "2.4 т" */
export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    const tonnes = kg / 1000;
    return `${tonnes >= 10 ? Math.round(tonnes) : Number(tonnes.toFixed(1))} т`;
  }
  return `${Math.round(kg * 10) / 10} кг`;
}
