"use client";

/**
 * Cliente HTTP con manejo automático de refresh token
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Intenta refrescar el access token
 */
async function refreshAccessToken(): Promise<boolean> {
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
        return true;
      }

      // 401 del refresh — sesión expirada
      console.log("[CLIENT] Token refresh failed with status:", res.status);
      return false;
    } catch (error) {
      console.error("[CLIENT] Error refreshing token:", error);
      return false;
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
    
    const refreshed = await refreshAccessToken();

    if (refreshed) {
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
    } else {
      // Si el refresh falló, redirigir al login
      console.log("[CLIENT] Refresh failed, redirecting to login");
      window.location.href = "/login";
    }
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
