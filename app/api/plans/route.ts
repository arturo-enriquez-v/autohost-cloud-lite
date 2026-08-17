import { NextResponse } from "next/server"
import { getAccessTokenFromCookie } from "@/lib/cookies"
import { getPlansBackend } from "@/lib/features/plans/fetch/plans.server"

export async function GET() {
  const accessToken = await getAccessTokenFromCookie()
  const res = await getPlansBackend(accessToken || undefined)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch plans" }))
    return NextResponse.json(err, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data ?? [], { status: 200 })
}
