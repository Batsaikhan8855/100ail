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
import { ApiError, apiGet, apiPost, clearToken, setToken } from "@/lib/api";

export type UserRole = "BUYER" | "SUPPLIER" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  supplier: { id: string; name: string; slug: string } | null;
  organization: { id: string; name: string; regNo: string } | null;
}

/** Энэ апп-д нэвтрэх эрхтэй роль */
export const ALLOWED_ROLES: UserRole[] = ["SUPPLIER", "ADMIN"];
export const DENY_MESSAGE = "Энэ систем нийлүүлэгчийн эрхээр нэвтэрнэ";

interface SessionValue {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Хуудас дахин ачаалагдахад token-оос сессийг сэргээнэ
  useEffect(() => {
    let cancelled = false;
    apiGet<SessionUser>("/auth/me")
      .then((me) => {
        if (cancelled) return;
        if (ALLOWED_ROLES.includes(me.role)) setUser(me);
        else clearToken();
      })
      .catch(() => clearToken())
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiPost<{ accessToken: string; user: SessionUser }>(
      "/auth/login",
      { email, password },
    );
    setToken(result.accessToken);

    const me = await apiGet<SessionUser>("/auth/me");
    if (!ALLOWED_ROLES.includes(me.role)) {
      clearToken();
      throw new ApiError(DENY_MESSAGE, 403);
    }
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
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
