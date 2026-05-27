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
 *
 * Mejoras sobre un setInterval fijo:
 *  - setTimeout recursivo: el siguiente ciclo comienza DESPUÉS de que el
 *    refresh actual termina, evitando solapamientos.
 *  - Retry rápido en error: si el backend está caído transitoriamente,
 *    reintenta en 30 s en vez de esperar 13 min.
 *  - Refresh al recuperar visibilidad: cuando el usuario vuelve a una pestaña
 *    que estuvo en segundo plano (donde setInterval puede estar throttleado),
 *    se dispara un refresh inmediato para no trabajar con un token caducado.
 */
const REFRESH_INTERVAL_MS  = 13 * 60 * 1_000; //  13 min (token TTL − 2 min)
const RETRY_ON_ERROR_MS    = 30 * 1_000;       //  30 s  (backend transitoriamente caído)

export function useTokenRefresh() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runRefresh() {
      if (cancelled) return;

      const outcome = await refreshAccessToken();
      if (cancelled) return;

      if (outcome === "expired") {
        // Sesión realmente expirada → login
        router.replace("/login");
        return;
      }

      // Programar el siguiente ciclo:
      //   "ok"    → próximo refresh normal en 13 min
      //   "error" → reintento rápido en 30 s (backend caído transitoriamente)
      const delay = outcome === "ok" ? REFRESH_INTERVAL_MS : RETRY_ON_ERROR_MS;
      timerRef.current = setTimeout(runRefresh, delay);
    }

    // Refresh inmediato al montar (cubre el caso de token caducado mientras la
    // pestaña estuvo cerrada o en background).
    runRefresh();

    // Refresh inmediato cuando la pestaña vuelve a ser visible.
    // Los navegadores throttlean setInterval/setTimeout en pestañas en segundo
    // plano, por lo que el proactive refresh puede no haber corrido a tiempo.
    const handleVisibility = () => {
      if (!document.hidden) {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        runRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);
}
