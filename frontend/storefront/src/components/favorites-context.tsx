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
import { apiDelete, apiGet, apiPost } from "@/lib/api";

/**
 * Хадгалсан бараа.
 *
 * Сагстай ижил зарчмаар серверт хадгалагдана — зочин `x-session-id`,
 * нэвтэрсэн хэрэглэгч token-оор. Тиймээс хуудас шинэчлэхэд ч, өөр
 * төхөөрөмж дээр ч үлдэнэ. Урьд нь зөвхөн санах ойд байсан тул зүрхэн
 * товч дардаг мөртөө юу ч хадгалдаггүй байв.
 */
interface FavoritesValue {
  ids: Set<string>;
  count: number;
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      setIds(new Set(await apiGet<string[]>("/favorites/ids")));
    } catch {
      // Хадгалсан бараа заавал биш — алдаа гарсан ч каталог ажиллана
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(
    async (productId: string) => {
      const saved = ids.has(productId);
      // Товч даруйдаа хариу үзүүлнэ, дараа нь серверээс баталгаажна
      setIds((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        const result = saved
          ? await apiDelete<string[]>(`/favorites/${productId}`)
          : await apiPost<string[]>("/favorites", { productId });
        setIds(new Set(result));
      } catch {
        void reload();
      }
    },
    [ids, reload],
  );

  const clear = useCallback(async () => {
    setIds(new Set());
    try {
      await apiDelete<string[]>("/favorites");
    } catch {
      void reload();
    }
  }, [reload]);

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      count: ids.size,
      ready,
      has: (productId: string) => ids.has(productId),
      toggle,
      clear,
      reload,
    }),
    [clear, ids, ready, reload, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites нь FavoritesProvider дотор ажиллана");
  }
  return context;
}
