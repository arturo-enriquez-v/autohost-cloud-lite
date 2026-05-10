import { generateEnrollmentTokenBackend } from "@/lib/features/enrollments/fetch/enrollment.server"
import { getAccessTokenFromCookie } from "@/lib/cookies"
import { NextResponse } from "next/server"

/**
 * POST /api/cli/authorize
 *
 * Called by the /cli-auth page when the user clicks "Authorize connection".
 * Generates a short-lived enrollment token via the Go backend, then returns
 * it alongside the public API URL so the CLI can complete node enrollment.
 *
 * Requires: access_token cookie (user must be logged in).
 */
export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie()

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // api_url sent by the CLI (its own outbound IP + port). Fall back to env var.
  let apiUrl = process.env.PUBLIC_API_URL ?? "http://localhost:8080"
  try {
    const body = await req.json()
    if (typeof body?.api_url === "string" && body.api_url) {
      apiUrl = body.api_url
    }
  } catch { /* no body is fine */ }

  try {
    const res = await generateEnrollmentTokenBackend(accessToken)

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(error, { status: res.status })
    }

    const { token } = await res.json()

    const response = NextResponse.json({ token, api_url: apiUrl })
    // Clear the pending CLI auth cookie now that authorization is complete.
    response.cookies.set("_cli_pending", "", { maxAge: 0, path: "/" })
    return response
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
