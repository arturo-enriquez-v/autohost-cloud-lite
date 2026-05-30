import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Returns the public-facing origin (scheme + host) using the headers that
 * Caddy (or any compliant reverse proxy) adds automatically:
 *   X-Forwarded-Proto  — original scheme seen by the browser (https)
 *   X-Forwarded-Host   — original domain seen by the browser (yourdomain.com)
 *
 * Without this, NextResponse.redirect() would produce URLs like
 * http://0.0.0.0:3000/ instead of https://yourdomain.com/.
 */
function publicOrigin(req: NextRequest): string {
  // APP_URL is the authoritative source — prevents Host Header Injection.
  // Only fall back to forwarded headers in dev (when APP_URL is not set).
  if (process.env.APP_URL) return process.env.APP_URL
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim()
    ?? req.nextUrl.protocol.replace(":", "")
  const host = req.headers.get("x-forwarded-host")
    ?? req.headers.get("host")
    ?? req.nextUrl.host
  return `${proto}://${host}`
}

export function proxy(req: NextRequest) {
  const origin = publicOrigin(req)
  const access  = req.cookies.get("access_token")?.value
  const refresh = req.cookies.get("refresh_token")?.value
  const isPublic = req.nextUrl.pathname.startsWith("/login")
                || req.nextUrl.pathname.startsWith("/register")

  if (!access && !isPublic) {
    if (refresh) {
      // access_token expirado pero hay refresh_token — renovar silenciosamente
      const url = new URL("/api/auth/silent-refresh", origin)
      url.searchParams.set("next", req.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    // Sin ningún token — al login
    const url = new URL("/login", origin)
    url.searchParams.set("next", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (access && isPublic) {
    return NextResponse.redirect(new URL("/", origin))
  }

  return NextResponse.next()
}

export const config = {
  // Excluir _next, api y assets — el middleware no intercepta API routes
  matcher: ["/((?!_next|api|favicon.ico|assets).*)"],
}
