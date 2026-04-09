import { NextRequest, NextResponse } from "next/server"

const SECURE = process.env.COOKIE_SECURE === "true"
const CLI_PENDING_COOKIE = "_cli_pending"

/**
 * GET /api/cli/auth-init?state=...&callback=...&node=...
 *
 * Stores the CLI auth params in a short-lived httpOnly cookie and redirects
 * to the login page with next=/cli-auth. This avoids URL encoding issues
 * when passing complex params through the login redirect flow.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const state = searchParams.get("state")
  const callback = searchParams.get("callback")
  const node = searchParams.get("node")
  const apiUrl = searchParams.get("api_url")

  if (!state || !callback || !node) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const pending = JSON.stringify({ state, callback, node, apiUrl })

  const res = NextResponse.redirect(new URL("/login?next=/cli-auth", req.url))
  res.cookies.set(CLI_PENDING_COOKIE, pending, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  })
  return res
}
