"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LoginRequest } from "@/lib/types";

/**
 * Hook para gestionar autenticación
 */
export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = responseData?.error || responseData?.message || "Invalid credentials";
        setError(msg);
        return { success: false, error: msg };
      }

      router.replace("/");
      return { success: true };
    } catch (err) {
      const msg = "Network error";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    logout,
    isLoading,
    error,
  };
}
