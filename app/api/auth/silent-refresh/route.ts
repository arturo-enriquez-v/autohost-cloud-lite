import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
  getRefreshTokenFromCookie,
} from "@/lib/cookies";

/**
 * GET /api/auth/silent-refresh?next=<path>
 *
 * Invocado por el middleware cuando el access_token expiró pero existe refresh_token.
 * Renueva el access_token y redirige al destino original sin interrumpir al usuario.
 * Si el refresh falla, redirige al login.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = searchParams.get("next") ?? "/";

  // Sanidad: evitar bucles si next apunta a esta ruta
  const destination = next.startsWith("/api/auth") ? "/" : next;

  const refreshToken = await getRefreshTokenFromCookie();

  if (!refreshToken) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(destination)}`, req.url)
    );
  }

  try {
    const res = await backendFetch("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.access_token) {
      const response = NextResponse.redirect(new URL(destination, req.url));
      response.cookies.set(ACCESS_COOKIE,  data.access_token,  ACCESS_COOKIE_OPTIONS);
      if (data.refresh_token) {
        response.cookies.set(REFRESH_COOKIE, data.refresh_token, REFRESH_COOKIE_OPTIONS);
      }
      return response;
    }
  } catch {
    // Caerá al bloque de abajo
  }

  // Refresh falló — limpiar y redirigir al login
  const response = NextResponse.redirect(
    new URL(`/login?next=${encodeURIComponent(destination)}`, req.url)
  );
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
