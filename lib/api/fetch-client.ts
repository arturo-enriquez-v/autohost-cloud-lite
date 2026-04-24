"use client";

/**
 * Cliente HTTP con manejo automático de refresh token
 */

let isRefreshing = false;
let refreshPromise: Promise<"ok" | "expired" | "error"> | null = null;

/**
 * Intenta refrescar el access token.
 * Retorna:
 *  - "ok"      → token renovado, reintentar la request original
 *  - "expired" → sesión realmente expirada, redirigir a login
 *  - "error"   → fallo transitorio (backend caído), no cerrar sesión
 */
async function refreshAccessToken(): Promise<"ok" | "expired" | "error"> {
  // Si ya estamos refrescando, esperar la promesa existente
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      console.log("[CLIENT] Attempting to refresh token...");
      
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      console.log("[CLIENT] Refresh response status:", res.status);

      if (res.ok) {
        console.log("[CLIENT] Token refreshed successfully");
        return "ok" as const;
      }

      // 503 = backend transitoriamente no disponible — no cerrar sesión
      if (res.status === 503) {
        console.warn("[CLIENT] Backend unreachable during refresh, keeping session");
        return "error" as const;
      }

      // 401/403 = sesión realmente expirada
      console.log("[CLIENT] Token refresh failed with status:", res.status);
      return "expired" as const;
    } catch (error) {
      console.error("[CLIENT] Error refreshing token:", error);
      return "error" as const;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

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
    console.log("[CLIENT] Received 401, attempting token refresh");
    
    const refreshResult = await refreshAccessToken();

    if (refreshResult === "ok") {
      // Reintentar la petición original con el nuevo token
      console.log("[CLIENT] Retrying original request with new token");
      response = await fetch(url, {
        ...options,
        credentials: "include",
      });

      // Si sigue en 401 tras el refresh, forzar logout
      if (response.status === 401) {
        console.log("[CLIENT] Still 401 after refresh, redirecting to login");
        window.location.href = "/login";
      }
    } else if (refreshResult === "expired") {
      // Sesión realmente expirada
      console.log("[CLIENT] Session expired, redirecting to login");
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
