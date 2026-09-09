"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api";

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Өөрчлөлт хийсний дараа дахин татах */
  reload: () => void;
  /** Серверт дахин хандалгүйгээр локал өгөгдлийг шинэчлэх */
  patch: (next: T) => void;
}

/** API-аас өгөгдөл татаж, ачаалалт болон алдааны төлөвийг нэг дор барина */
export function useResource<T>(path: string | null): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiGet<T>(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { data, error, loading, reload, patch: setData };
}
