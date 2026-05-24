"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api/fetch-client";

/**
 * Renueva el access_token proactivamente antes de que expire.
 *
 * ACCESS_TOKEN_TTL = 15 min → refrescamos cada 13 min (2 min de margen).
 * Usa refreshAccessToken() de fetch-client para coordinar con el canal
 * BroadcastChannel y evitar la race condition con refreshes reactivos
 * (los 401 de fetchWithAuth) que también usan esa misma función.
 */
const REFRESH_INTERVAL_MS = 13 * 60 * 1_000; // 13 minutos

export function useTokenRefresh() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function proactiveRefresh() {
      const outcome = await refreshAccessToken();
      if (outcome === "expired") {
        // Sesión realmente expirada — redirigir al login
        router.replace("/login");
      }
      // "ok": token renovado
      // "error": fallo transitorio — el siguiente ciclo reintentará
    }

    // Intentar renovar inmediatamente al montar, por si el token ya está
    // próximo a expirar o ya expiró mientras la pestaña estaba cerrada.
    proactiveRefresh();
    timerRef.current = setInterval(proactiveRefresh, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);
}
