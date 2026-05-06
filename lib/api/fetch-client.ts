"use client";

/**
 * Cliente HTTP con manejo automático de refresh token.
 *
 * Usa BroadcastChannel para coordinar el refresh entre pestañas:
 * si una pestaña ya está renovando el token, las demás esperan
 * su resultado en lugar de hacer refresh en paralelo (lo que
 * causaría que el token rotado sea revocado por otra pestaña).
 */

type RefreshOutcome = "ok" | "expired" | "error";

// Estado local de esta pestaña
let isRefreshing = false;
let refreshPromise: Promise<RefreshOutcome> | null = null;

// Canal para coordinación entre pestañas (solo en browser)
const _channel =
  typeof window !== "undefined" ? new BroadcastChannel("autohost_refresh") : null;

/**
 * Espera a que otra pestaña termine su refresh y devuelve el resultado.
 * Si tarda más de 8 s, asume fallo transitorio.
 */
function waitForOtherTab(): Promise<RefreshOutcome> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      _channel?.removeEventListener("message", handler);
      resolve("error");
    }, 8_000);

    function handler(e: MessageEvent<{ type: string; outcome?: RefreshOutcome }>) {
      if (e.data.type === "REFRESH_DONE") {
        clearTimeout(timeout);
        _channel?.removeEventListener("message", handler);
        resolve(e.data.outcome ?? "error");
      }
    }

    _channel?.addEventListener("message", handler);
  });
}

/**
 * Intenta refrescar el access token.
 * Retorna:
 *  - "ok"      → token renovado, reintentar la request original
 *  - "expired" → sesión realmente expirada, redirigir a login
 *  - "error"   → fallo transitorio (backend caído), no cerrar sesión
 */
export async function refreshAccessToken(): Promise<RefreshOutcome> {
  // Otra pestaña ya está refrescando — esperar su resultado
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async (): Promise<RefreshOutcome> => {
    // Avisar a las demás pestañas que esta ya está haciendo el refresh
    _channel?.postMessage({ type: "REFRESHING" });

    let outcome: RefreshOutcome;
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        outcome = "ok";
      } else if (res.status === 503) {
        // Backend transitoriamente no disponible — no cerrar sesión
        outcome = "error";
      } else {
        // 401/403 = sesión realmente expirada
        outcome = "expired";
      }
    } catch {
      outcome = "error";
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }

    // Notificar resultado a las otras pestañas
    _channel?.postMessage({ type: "REFRESH_DONE", outcome });
    return outcome;
  })();

  return refreshPromise;
}

// Si otra pestaña anuncia que está refrescando, esta pestaña espera
// su resultado en lugar de lanzar un refresh propio en paralelo.
_channel?.addEventListener(
  "message",
  (e: MessageEvent<{ type: string }>) => {
    if (e.data.type === "REFRESHING" && !isRefreshing) {
      isRefreshing = true;
      refreshPromise = waitForOtherTab().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
  }
);

/**
 * Fetch con retry automático en caso de 401
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Primer intento
  let response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  // Si obtenemos 401, intentar refrescar el token
  if (response.status === 401) {
    const refreshResult = await refreshAccessToken();

    if (refreshResult === "ok") {
      // Reintentar la petición original con el nuevo token
      response = await fetch(url, {
        ...options,
        credentials: "include",
      });

      // Si sigue en 401 tras el refresh, forzar logout
      if (response.status === 401) {
        window.location.href = "/login";
      }
    } else if (refreshResult === "expired") {
      window.location.href = "/login";
    }
    // refreshResult === "error": error transitorio, devolver el 401 sin cerrar sesión
  }

  return response;
}

/**
 * Wrapper para hacer logout y limpiar cookies
 */
export async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("[CLIENT] Logout error:", error);
  } finally {
    window.location.href = "/login";
  }
}
