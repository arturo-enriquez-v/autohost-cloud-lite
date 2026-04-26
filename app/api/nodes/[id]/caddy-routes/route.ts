import { NextResponse } from "next/server";
import {
  listCaddyRoutesBackend,
  upsertCaddyRouteBackend,
  mapCaddyRouteFromBackend,
} from "@/lib/api/caddy-routes";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { CaddyRouteBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]/caddy-routes
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
    const res = await listCaddyRoutesBackend(nodeId, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: CaddyRouteBackendResponse[] = await res.json();
    return NextResponse.json((data ?? []).map(mapCaddyRouteFromBackend));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/nodes/[id]/caddy-routes
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
    const res = await upsertCaddyRouteBackend(nodeId, body, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: CaddyRouteBackendResponse = await res.json();
    return NextResponse.json(mapCaddyRouteFromBackend(data));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
