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
/**
 * Returns the public-facing origin using Caddy's forwarded headers so that
 * redirects go to https://yourdomain.com instead of http://0.0.0.0:3000.
 */
function publicOrigin(req: Request): string {
  // APP_URL is the authoritative source — prevents Host Header Injection.
  // Only fall back to forwarded headers in dev (when APP_URL is not set).
  if (process.env.APP_URL) return process.env.APP_URL
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim()
    ?? new URL(req.url).protocol.replace(":", "")
  const host = req.headers.get("x-forwarded-host")
    ?? req.headers.get("host")
    ?? new URL(req.url).host
  return `${proto}://${host}`
}

/**
 * Validates that a redirect destination is a safe relative path.
 * Rejects absolute URLs (https://evil.com) and protocol-relative URLs (//evil.com)
 * to prevent open redirect attacks.
 */
function safeDestination(raw: string | null): string {
  if (!raw) return "/"
  // Must start with / but NOT // (protocol-relative) or contain a scheme (absolute URL)
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/"
  // Block auth loops
  if (raw.startsWith("/api/auth")) return "/"
  return raw
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const destination = safeDestination(searchParams.get("next"));

  const origin = publicOrigin(req);
  const refreshToken = await getRefreshTokenFromCookie();

  if (!refreshToken) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(destination)}`, origin)
    );
  }

  try {
    const res = await backendFetch("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.access_token) {
      const response = NextResponse.redirect(new URL(destination, origin));
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
    new URL(`/login?next=${encodeURIComponent(destination)}`, origin)
  );
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
