import { NextResponse } from "next/server";
import {
  checkServiceMonitorNowBackend,
  readBackendError,
} from "@/lib/features/nodes/monitoring/fetch/service-monitors";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// POST /api/nodes/[id]/service-monitors/[monitorId]/check
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const { monitorId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await checkServiceMonitorNowBackend(monitorId, accessToken);
    if (!res.ok) {
      const err = await readBackendError(res, "Request failed");
      return NextResponse.json(err, { status: res.status });
    }
    return NextResponse.json({ status: "requested" }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
