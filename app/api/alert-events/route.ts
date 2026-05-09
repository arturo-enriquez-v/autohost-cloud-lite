import { NextResponse } from "next/server";
import { listAlertEventsBackend } from "@/lib/features/alerts/fetch/alert-events";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { AlertEvent } from "@/lib/types";

// GET /api/alert-events?limit=50&offset=0
export async function GET(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const offset = Number(searchParams.get("offset") ?? "0");

  try {
    const res = await listAlertEventsBackend(accessToken, limit, offset);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: AlertEvent[] = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
