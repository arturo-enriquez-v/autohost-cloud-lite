import { NextResponse } from "next/server";
import {
  getNodeAlertConfigBackend,
  upsertNodeAlertConfigBackend,
  mapNodeAlertFromBackend,
} from "@/lib/features/nodes/config/fetch/node-alert.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { NodeAlertConfigBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]/alerts
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
    const res = await getNodeAlertConfigBackend(nodeId, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: NodeAlertConfigBackendResponse = await res.json();
    return NextResponse.json(mapNodeAlertFromBackend(data), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/nodes/[id]/alerts
export async function PUT(
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
    const res = await upsertNodeAlertConfigBackend(nodeId, body, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: NodeAlertConfigBackendResponse = await res.json();
    return NextResponse.json(mapNodeAlertFromBackend(data), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
