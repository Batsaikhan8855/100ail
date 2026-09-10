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
import { apiGet, apiPost, clearToken, setToken } from "@/lib/api";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "BUYER" | "SUPPLIER" | "ADMIN";
  organization: { id: string; name: string; regNo: string } | null;
}

interface SessionValue {
  user: SessionUser | null;
  ready: boolean;
  /** И-мэйл эсвэл утасны дугаараар нэвтэрнэ */
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Нэвтрэлт заавал биш: зочин ч сагс үүсгэж, захиалга хийж болно */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<SessionUser>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => clearToken())
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(async (accessToken: string) => {
    setToken(accessToken);
    setUser(await apiGet<SessionUser>("/auth/me"));
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const result = await apiPost<{ accessToken: string }>("/auth/login", {
        identifier,
        password,
      });
      await finish(result.accessToken);
    },
    [finish],
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      phone?: string;
    }) => {
      const result = await apiPost<{ accessToken: string }>(
        "/auth/register",
        input,
      );
      await finish(result.accessToken);
    },
    [finish],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession нь SessionProvider дотор ажиллана");
  return context;
}
