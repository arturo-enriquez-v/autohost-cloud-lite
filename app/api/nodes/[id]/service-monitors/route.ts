import { NextResponse } from "next/server";
import {
  listServiceMonitorsBackend,
  createServiceMonitorBackend,
  mapMonitorFromBackend,
} from "@/lib/api/service-monitors";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { ServiceMonitorBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]/service-monitors
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await listServiceMonitorsBackend(nodeId, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: ServiceMonitorBackendResponse[] = await res.json();
    return NextResponse.json((data ?? []).map(mapMonitorFromBackend));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/nodes/[id]/service-monitors
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await createServiceMonitorBackend({ ...body, nodeId }, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: ServiceMonitorBackendResponse = await res.json();
    return NextResponse.json(mapMonitorFromBackend(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
