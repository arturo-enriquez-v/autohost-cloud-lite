import { NextResponse } from "next/server";
import { getNodeBackend, mapNodeWithMetricsFromBackend } from "@/lib/api/nodes";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { NodeWithMetricsBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]
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
    const res = await getNodeBackend(nodeId, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: NodeWithMetricsBackendResponse = await res.json();
    return NextResponse.json(mapNodeWithMetricsFromBackend(data), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
