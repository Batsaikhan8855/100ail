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
      };
      map.set(key, group);
    }
    group.lines.push(line);
    group.goodsTotal += lineTotal(line);
    // Нэг нийлүүлэгчээс нэг удаа хүргэнэ: хамгийн өндөр хүргэлтийн үнийг авна
    group.deliveryPrice = Math.max(group.deliveryPrice, line.deliveryPrice ?? 0);
    group.deliveryDays = Math.max(group.deliveryDays ?? 0, line.deliveryDays ?? 0);
  }

  return [...map.values()].map((group) => ({
    ...group,
    deliveryDays: group.deliveryDays || undefined,
    total: group.goodsTotal + group.deliveryPrice,
  }));
};

/** API-гийн сагсны мөр */
interface ApiCartLine {
  offerId: string;
  productId: string;
  productSlug: string;
  productName: string;
  art: string;
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
}

interface ApiCart {
  id: string;
  lines: ApiCartLine[];
  goodsTotal: number;
  deliveryTotal: number;
  total: number;
  count: number;
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
  bulkPrice: line.bulkPrice ?? undefined,
  bulkMinQty: line.bulkMinQty ?? undefined,
  deliveryPrice: line.deliveryPrice,
  deliveryDays: line.deliveryDays ?? undefined,
  location: line.location ?? undefined,
  stock: line.stock,
});

interface CartContextValue {
  lines: CartLine[];
  groups: SupplierGroup[];
  count: number;
  goodsTotal: number;
  deliveryTotal: number;
  total: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((cart: ApiCart) => {
    setLines(cart.lines.map(toLine));
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

  const value = useMemo<CartContextValue>(() => {
    const groups = groupBySupplier(lines);
    const goodsTotal = groups.reduce((sum, group) => sum + group.goodsTotal, 0);
    const deliveryTotal = groups.reduce((sum, group) => sum + group.deliveryPrice, 0);
    return {
      lines,
      groups,
      count: lines.length,
      goodsTotal,
      deliveryTotal,
      total: goodsTotal + deliveryTotal,
      loading,
      error,
      addLine,
      setQty,
      removeLine,
      clear,
      reload,
    };
  }, [addLine, clear, error, lines, loading, reload, removeLine, setQty]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart-ыг CartProvider дотор ашиглана");
  return context;
}
