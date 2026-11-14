"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/lib/types";

interface CurrentUserContextValue {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

/**
 * Loads /api/auth/me once for the whole dashboard and exposes the global role
 * (admin / member) plus the user's project memberships and node grants.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) setUser(await res.json());
    } catch {
      /* keep previous value */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <CurrentUserContext.Provider value={{ user, isAdmin: Boolean(user?.is_admin), isLoading, reload }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    return { user: null, isAdmin: false, isLoading: true, reload: async () => {} };
  }
  return ctx;
}
