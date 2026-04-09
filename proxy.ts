import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(req: NextRequest) {
  const access  = req.cookies.get("access_token")?.value
  const refresh = req.cookies.get("refresh_token")?.value
  const isPublic = req.nextUrl.pathname.startsWith("/login")
                || req.nextUrl.pathname.startsWith("/register")

  if (!access && !isPublic) {
    if (refresh) {
      // access_token expirado pero hay refresh_token — renovar silenciosamente
      const url = req.nextUrl.clone()
      url.pathname = "/api/auth/silent-refresh"
      url.searchParams.set("next", req.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    // Sin ningún token — al login
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (access && isPublic) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Excluir _next, api y assets — el middleware no intercepta API routes
  matcher: ["/((?!_next|api|favicon.ico|assets).*)"],
}
