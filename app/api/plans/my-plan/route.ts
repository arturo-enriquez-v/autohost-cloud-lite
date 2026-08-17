import { NextResponse } from "next/server"
import { getAccessTokenFromCookie } from "@/lib/cookies"
import { getUserPlanBackend, changePlanBackend } from "@/lib/features/plans/fetch/plans.server"

export async function GET() {
  const accessToken = await getAccessTokenFromCookie()
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await getUserPlanBackend(accessToken)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch user plan" }))
    return NextResponse.json(err, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: 200 })
}

export async function PUT(request: Request) {
  const accessToken = await getAccessTokenFromCookie()
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.plan_id) return NextResponse.json({ error: "plan_id is required" }, { status: 400 })

  const res = await changePlanBackend(body.plan_id, accessToken)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update plan" }))
    return NextResponse.json(err, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: 200 })
}
