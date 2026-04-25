import { NextResponse } from "next/server";
import {
  updateServiceMonitorBackend,
  deleteServiceMonitorBackend,
  mapMonitorFromBackend,
} from "@/lib/api/service-monitors";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { ServiceMonitorBackendResponse } from "@/lib/types";

// PUT /api/nodes/[id]/service-monitors/[monitorId]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const { id: nodeId, monitorId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await updateServiceMonitorBackend(monitorId, { ...body, nodeId }, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: ServiceMonitorBackendResponse = await res.json();
    return NextResponse.json(mapMonitorFromBackend(data));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/nodes/[id]/service-monitors/[monitorId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const { monitorId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await deleteServiceMonitorBackend(monitorId, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
