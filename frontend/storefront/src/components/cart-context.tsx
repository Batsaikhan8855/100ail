"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { ArtKey, CartLine } from "@/data/catalog";

/** Бөөний үнэ нь зөвхөн доод тоо хэмжээнээс дээш захиалгад хүчинтэй */
export const lineUnitPrice = (line: CartLine): number =>
  line.bulkPrice && line.qty >= (line.bulkMinQty ?? Infinity)
    ? line.bulkPrice
    : line.unitPrice;

export const lineTotal = (line: CartLine): number =>
  lineUnitPrice(line) * line.qty;

/**
 * Захиалга нийлүүлэгч тус бүрээр хуваагдана: агуулах, хүргэлт, шимтгэлийн
 * тооцоо тус тусдаа явагддаг (архитектурын баримтын 5, 6-р хэсэг).
 */
export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  location?: string;
  deliveryPrice: number;
  deliveryDays?: number;
  lines: CartLine[];
  goodsTotal: number;
  total: number;
  /** Бүлгийн нийт жин (кг) ба овор (м³) */
  weightKg: number;
  volumeM3: number;
  /** Аль нэг мөрийн жин таамагласан бол */
  weightEstimated: boolean;
}

export const groupBySupplier = (lines: CartLine[]): SupplierGroup[] => {
  const map = new Map<string, SupplierGroup>();

  for (const line of lines) {
    const key = line.supplierId || line.supplierName;
    let group = map.get(key);
    if (!group) {
      group = {
        supplierId: key,
        supplierName: line.supplierName,
        location: line.location,
        deliveryPrice: 0,
        deliveryDays: undefined,
        lines: [],
        goodsTotal: 0,
        total: 0,
        weightKg: 0,
        volumeM3: 0,
        weightEstimated: false,
      };
      map.set(key, group);
    }
    group.lines.push(line);
    group.goodsTotal += lineTotal(line);
    group.weightKg += line.lineWeightKg ?? 0;
    group.volumeM3 += line.lineVolumeM3 ?? 0;
    if (line.weightEstimated) group.weightEstimated = true;
    // Нэг нийлүүлэгчээс нэг удаа хүргэнэ: хамгийн өндөр хүргэлтийн үнийг авна
    group.deliveryPrice = Math.max(group.deliveryPrice, line.deliveryPrice ?? 0);
    group.deliveryDays = Math.max(group.deliveryDays ?? 0, line.deliveryDays ?? 0);
  }

  return [...map.values()].map((group) => ({
    ...group,
    deliveryDays: group.deliveryDays || undefined,
    total: group.goodsTotal + group.deliveryPrice,
    weightKg: Math.round(group.weightKg * 10) / 10,
    volumeM3: Math.round(group.volumeM3 * 100) / 100,
  }));
};

/** API-гийн сагсны мөр */
interface ApiCartLine {
  offerId: string;
  productId: string;
  productSlug: string;
  productName: string;
  art: string;
  image: string | null;
  supplierId: string;
  supplierName: string;
  basePrice: number;
  bulkPrice: number | null;
  bulkMinQty: number | null;
  unitPrice: number;
  qty: number;
  unit: string;
  lineTotal: number;
  deliveryPrice: number;
  deliveryDays: number | null;
  location: string | null;
  stock: number;
  unitWeightKg: number;
  lineWeightKg: number;
  unitVolumeM3: number;
  lineVolumeM3: number;
  weightEstimated: boolean;
}

/** Хүргэлтийн машины ангилал (common/logistics-ийн VEHICLES) */
export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
  /** Улаанбаатар доторх нэг ачилтын тариф (₮) */
  price: number;
  /** Тэвшний дотор хэмжээ, метрээр */
  bed: VehicleBed;
  /** Тэвшний эзэлхүүн, м³. Сервер өгөөгүй бол 0 — оврыг тооцохгүй */
  volumeM3: number;
  /** Гадна габарит. Сервер өгөөгүй бол тэг — хэмжээсийн зураг гарахгүй */
  spec: VehicleSpec;
  /** Хэмжээсийн зургийн их биений хэлбэр */
  shape: VehicleShape;
  /** Тэвшний шалан дээр багтах стандарт паллетын тоо */
  pallets: number;
}

/** Их биений хэлбэр — задгай тэвш, битүү тэвш, чиргүүл */
export type VehicleShape = "pickup" | "box" | "semi";

/** Машины гадна габарит ба гүүрний байрлал, метрээр */
export interface VehicleSpec {
  lengthM: number;
  widthM: number;
  heightM: number;
  wheelbaseM: number;
  frontOverhangM: number;
  rearOverhangM: number;
}

/** Тэвшний дотор хэмжээ, метрээр */
export interface VehicleBed {
  lengthM: number;
  widthM: number;
  heightM: number;
}

/** Овор, габаритын талбарууд нь хуучин серверээс ирэхгүй байж болно */
interface ApiVehicle
  extends Omit<Vehicle, "bed" | "volumeM3" | "spec" | "shape" | "pallets"> {
  bed?: VehicleBed | null;
  volumeM3?: number | null;
  spec?: VehicleSpec | null;
  shape?: VehicleShape | null;
  pallets?: number | null;
}

const ZERO_BED: VehicleBed = { lengthM: 0, widthM: 0, heightM: 0 };
const ZERO_SPEC: VehicleSpec = {
  lengthM: 0,
  widthM: 0,
  heightM: 0,
  wheelbaseM: 0,
  frontOverhangM: 0,
  rearOverhangM: 0,
};

/**
 * Машины оврыг гүйцээнэ. Хуучин сервер `bed`, `volumeM3` буцаахгүй тул
 * тэднийг 0 болгож, хүргэлтийг өмнөх шигээ зөвхөн жингээр бодуулна —
 * сагс бүхэлдээ уншихаа болихоос тэр нь дээр.
 */
const toVehicle = (vehicle: ApiVehicle): Vehicle => {
  const bed = vehicle.bed ?? ZERO_BED;
  return {
    ...vehicle,
    bed,
    spec: vehicle.spec ?? ZERO_SPEC,
    shape: vehicle.shape ?? "box",
    pallets: vehicle.pallets ?? 0,
    volumeM3:
      vehicle.volumeM3 ??
      Math.round(bed.lengthM * bed.widthM * bed.heightM * 10) / 10,
  };
};

/** Хүргэлтийн төлөвлөгөө — серверт тооцогдоно (common/logistics) */
export interface Shipment {
  totalKg: number;
  label: string;
  /** Нийт овор, м³ ба уншигдахуйц бичиглэл */
  totalM3: number;
  volumeLabel: string;
  /** Машиныг жин нь тодорхойлсон уу, овор нь уу. Хуучин серверт хоосон */
  limitedBy?: "weight" | "volume";
  trips: number;
  /** Жин нь таамагласан эсэх (нийлүүлэгч оруулаагүй) */
  estimated: boolean;
  vehicle: Vehicle | null;
  /** Тээврийн үнэ: машины тариф × ачилтын тоо */
  price: number;
  /** Худалдан авагч машинаа өөрөө сонгосон эсэх */
  chosen: boolean;
}

interface ApiCart {
  id: string;
  lines: ApiCartLine[];
  groups: { supplierId: string; shipment: Shipment }[];
  goodsTotal: number;
  deliveryTotal: number;
  total: number;
  count: number;
  weightKg: number;
  weightLabel: string;
  volumeM3: number;
  volumeLabel: string;
  vehicles: ApiVehicle[];
}

const toLine = (line: ApiCartLine): CartLine => ({
  offerId: line.offerId,
  productId: line.productId,
  productSlug: line.productSlug,
  productName: line.productName,
  supplierId: line.supplierId,
  supplierName: line.supplierName,
  // Бөөний хямдралыг UI тал дахин тооцох тул суурь үнийг дамжуулна
  unitPrice: line.basePrice,
  qty: line.qty,
  unit: line.unit,
  art: line.art as ArtKey,
  image: line.image ?? undefined,
  bulkPrice: line.bulkPrice ?? undefined,
  bulkMinQty: line.bulkMinQty ?? undefined,
  deliveryPrice: line.deliveryPrice,
  deliveryDays: line.deliveryDays ?? undefined,
  location: line.location ?? undefined,
  stock: line.stock,
  unitWeightKg: line.unitWeightKg,
  lineWeightKg: line.lineWeightKg,
  unitVolumeM3: line.unitVolumeM3,
  lineVolumeM3: line.lineVolumeM3,
  weightEstimated: line.weightEstimated,
});

interface CartContextValue {
  lines: CartLine[];
  groups: SupplierGroup[];
  count: number;
  goodsTotal: number;
  deliveryTotal: number;
  total: number;
  /** Нийлүүлэгч тус бүрийн хүргэлтийн төлөвлөгөө */
  shipments: Record<string, Shipment>;
  /** Сонгож болох бүх машины ангилал, даацаар нь эрэмбэлсэн */
  vehicles: Vehicle[];
  /** Тухайн нийлүүлэгчийн ачаанд одоо сонгогдоод байгаа машин */
  vehicleFor: (supplierId: string) => Vehicle | null;
  /** Худалдан авагч машинаа өөрөө солино (зөвхөн багтах машин) */
  setVehicle: (supplierId: string, vehicleId: string) => Promise<void>;
  /** Сагсны нийт жин ба овор */
  weightKg: number;
  weightLabel: string;
  volumeM3: number;
  volumeLabel: string;
  loading: boolean;
  error: string | null;
  /** Ижил offer дахин нэмэгдвэл тоо хэмжээ нэмэгдэнэ */
  addLine: (offerId: string, qty?: number) => Promise<void>;
  setQty: (offerId: string, qty: number) => Promise<void>;
  removeLine: (offerId: string) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Машины сонголтыг сервер тооцдог тул логикийг энд давхардуулахгүй.
  // Сагс өөрчлөгдөх бүрд хариунаас шинэчлэгдэнэ.
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [weight, setWeight] = useState({ kg: 0, label: "" });
  const [volume, setVolume] = useState({ m3: 0, label: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((cart: ApiCart) => {
    setLines(cart.lines.map(toLine));
    setShipments(
      Object.fromEntries(
        (cart.groups ?? []).map((group) => [group.supplierId, group.shipment]),
      ),
    );
    setVehicles((cart.vehicles ?? []).map(toVehicle));
    setWeight({ kg: cart.weightKg ?? 0, label: cart.weightLabel ?? "" });
    setVolume({ m3: cart.volumeM3 ?? 0, label: cart.volumeLabel ?? "" });
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await apiGet<ApiCart>("/carts"));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  // Сагс серверт хадгалагдана: зочид x-session-id, нэвтэрсэн хэрэглэгч token-оор
  useEffect(() => {
    void reload();
  }, [reload]);

  const addLine = useCallback(
    async (offerId: string, qty = 1) => {
      try {
        apply(await apiPost<ApiCart>("/carts/items", { offerId, qty }));
      } catch (cause) {
        setError((cause as Error).message);
        throw cause;
      }
    },
    [apply],
  );

  const setQty = useCallback(
    async (offerId: string, qty: number) => {
      if (!Number.isFinite(qty)) return;
      const next = Math.max(1, Math.round(qty));
      // Сервер хариулахаас өмнө тоог шууд шинэчилж, хүлээлтгүй мэдрэмж өгнө
      setLines((prev) =>
        prev.map((line) => (line.offerId === offerId ? { ...line, qty: next } : line)),
      );
      try {
        apply(await apiPatch<ApiCart>(`/carts/items/${offerId}`, { qty: next }));
      } catch (cause) {
        setError((cause as Error).message);
        await reload();
      }
    },
    [apply, reload],
  );

  const removeLine = useCallback(
    async (offerId: string) => {
      setLines((prev) => prev.filter((line) => line.offerId !== offerId));
      try {
        apply(await apiDelete<ApiCart>(`/carts/items/${offerId}`));
      } catch (cause) {
        setError((cause as Error).message);
        await reload();
      }
    },
    [apply, reload],
  );

  const clear = useCallback(async () => {
    setLines([]);
    try {
      apply(await apiDelete<ApiCart>("/carts"));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [apply]);

  /**
   * Машины сонголт хүргэлтийн үнийг тодорхойлдог тул серверт хадгална —
   * захиалга үүсэхэд мөн адил дүн гарна. Хариунд шинэчилсэн сагс ирнэ.
   */
  const setVehicle = useCallback(
    async (supplierId: string, vehicleId: string) => {
      try {
        apply(
          await apiPatch<ApiCart>("/carts/vehicle", { supplierId, vehicleId }),
        );
      } catch (cause) {
        setError((cause as Error).message);
      }
    },
    [apply],
  );

  /** Тухайн нийлүүлэгчийн ачаанд одоо гарах машин (сервер шийднэ) */
  const vehicleFor = useCallback(
    (supplierId: string): Vehicle | null => shipments[supplierId]?.vehicle ?? null,
    [shipments],
  );

  const value = useMemo<CartContextValue>(() => {
    // Хүргэлтийн үнэ = нийлүүлэгчийн нэмэлт + гарах машины тариф.
    // Тарифыг сервер бодож `shipment.price`-аар өгнө (common/logistics).
    const groups = groupBySupplier(lines).map((group) => {
      const deliveryPrice =
        group.deliveryPrice + (shipments[group.supplierId]?.price ?? 0);
      return {
        ...group,
        deliveryPrice,
        total: group.goodsTotal + deliveryPrice,
      };
    });
    const goodsTotal = groups.reduce((sum, group) => sum + group.goodsTotal, 0);
    const deliveryTotal = groups.reduce((sum, group) => sum + group.deliveryPrice, 0);
    return {
      lines,
      groups,
      count: lines.length,
      goodsTotal,
      deliveryTotal,
      total: goodsTotal + deliveryTotal,
      shipments,
      vehicles,
      vehicleFor,
      setVehicle,
      weightKg: weight.kg,
      weightLabel: weight.label,
      volumeM3: volume.m3,
      volumeLabel: volume.label,
      loading,
      error,
      addLine,
      setQty,
      removeLine,
      clear,
      reload,
    };
  }, [
    addLine,
    clear,
    error,
    lines,
    loading,
    reload,
    removeLine,
    setQty,
    setVehicle,
    shipments,
    vehicleFor,
    vehicles,
    volume,
    weight,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart-ыг CartProvider дотор ашиглана");
  return context;
}
