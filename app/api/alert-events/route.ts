import { NextResponse } from "next/server";
import { listAlertEventsBackend } from "@/lib/features/alerts/fetch/alert.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// GET /api/alert-events?limit=20&offset=0&node_id=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");
  const filters = {
    nodeId: searchParams.get("node_id") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  try {
    const res = await listAlertEventsBackend(accessToken, limit, offset, filters);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
