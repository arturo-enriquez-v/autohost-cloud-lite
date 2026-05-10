import { NextResponse } from "next/server";
import { getUptimeHistory24hBackend, mapUptimeFromBackend } from "@/lib/features/nodes/monitoring/fetch/service-monitors";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { UptimePointBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]/service-monitors/[monitorId]/uptime
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const { monitorId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await getUptimeHistory24hBackend(monitorId, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: UptimePointBackendResponse[] = await res.json();
    return NextResponse.json((data ?? []).map(mapUptimeFromBackend));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
