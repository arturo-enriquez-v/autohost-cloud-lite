import { NextResponse } from "next/server";
import { deleteCaddyRouteBackend } from "@/lib/api/caddy-routes";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// DELETE /api/nodes/[id]/caddy-routes/[domain]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; domain: string }> }
) {
  const { id: nodeId, domain } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await deleteCaddyRouteBackend(nodeId, domain, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
