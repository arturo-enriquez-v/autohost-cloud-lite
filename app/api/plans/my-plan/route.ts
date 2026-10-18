import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "Plans and subscriptions are disabled" }, { status: 404 })
}
