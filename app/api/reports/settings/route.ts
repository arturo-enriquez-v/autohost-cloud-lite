import { NextResponse } from "next/server"
import { backendFetch } from "@/lib/api"
import { getAccessTokenFromCookie } from "@/lib/cookies"
import { API_ENDPOINTS } from "@/config/constants"

export async function GET() {
  const token = await getAccessTokenFromCookie()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await backendFetch(API_ENDPOINTS.REPORTS.SETTINGS, { method: "GET" }, token)
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(req: Request) {
  const token = await getAccessTokenFromCookie()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const res = await backendFetch(
    API_ENDPOINTS.REPORTS.SETTINGS,
    { method: "PUT", body: JSON.stringify(body) },
    token,
  )
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
