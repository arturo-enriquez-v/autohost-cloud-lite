import { NextResponse } from "next/server";
import {
  getEventHistoryBackend,
  mapEventFromBackend,
  readBackendError,
} from "@/lib/features/nodes/monitoring/fetch/service-monitors";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { ServiceHealthEventBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]/service-monitors/[monitorId]/history?limit=20
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const { monitorId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  const limit = Number.isInteger(requested) && requested > 0 && requested <= 1000 ? requested : 20;

  try {
    const res = await getEventHistoryBackend(monitorId, limit, accessToken);
    if (!res.ok) {
      const err = await readBackendError(res, "Request failed");
      return NextResponse.json(err, { status: res.status });
    }
    const data: ServiceHealthEventBackendResponse[] = await res.json();
    return NextResponse.json((data ?? []).map(mapEventFromBackend));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
