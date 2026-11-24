import { NextResponse } from "next/server";
import {
  getAutoHealEventsBackend,
  mapAutoHealEventFromBackend,
  readBackendError,
} from "@/lib/features/nodes/monitoring/fetch/service-monitors";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { MetricRange, AutoHealEventBackendResponse } from "@/lib/features/nodes/types";

const RANGES: MetricRange[] = ["1d", "7d", "30d"];

// GET /api/nodes/[id]/service-monitors/[monitorId]/autoheal-events?range=1d|7d|30d
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const { monitorId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = new URL(req.url).searchParams.get("range") ?? "1d";
  if (!RANGES.includes(requested as MetricRange)) {
    return NextResponse.json({ error: "range must be 1d, 7d or 30d" }, { status: 400 });
  }

  try {
    const res = await getAutoHealEventsBackend(monitorId, requested as MetricRange, accessToken);
    if (!res.ok) {
      const err = await readBackendError(res, "Request failed");
      return NextResponse.json(err, { status: res.status });
    }
    const data: AutoHealEventBackendResponse[] = await res.json();
    return NextResponse.json((data ?? []).map(mapAutoHealEventFromBackend));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
