import { NextResponse } from "next/server"
import { getAccessTokenFromCookie } from "@/lib/cookies"
import { getUserPlanUsageBackend } from "@/lib/features/plans/fetch/plans.server"

export async function GET() {
  const accessToken = await getAccessTokenFromCookie()
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await getUserPlanUsageBackend(accessToken)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch plan usage" }))
    return NextResponse.json(err, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: 200 })
}
