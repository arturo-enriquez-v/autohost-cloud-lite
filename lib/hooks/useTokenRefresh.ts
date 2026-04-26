"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Renueva el access_token proactivamente antes de que expire.
 *
 * ACCESS_TOKEN_TTL = 15 min → refrescamos cada 13 min (2 min de margen).
 * Esto evita que múltiples hooks de polling (nodes, metrics, monitors)
 * reciban un 401 simultáneo y disparen un race condition entre pestañas.
 *
 * Se apoya en el BroadcastChannel de fetch-client para que solo una
 * pestaña haga el refresh aunque todas tengan el timer activo.
 */
const REFRESH_INTERVAL_MS = 13 * 60 * 1_000; // 13 minutos

export function useTokenRefresh() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function proactiveRefresh() {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (res.status === 401 || res.status === 403) {
          // Sesión realmente expirada — redirigir al login
          router.replace("/login");
        }
        // 503 / error de red: no hacer nada, el siguiente ciclo reintentará
      } catch {
        // Error de red transitorio — ignorar
      }
    }

    timerRef.current = setInterval(proactiveRefresh, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);
}
