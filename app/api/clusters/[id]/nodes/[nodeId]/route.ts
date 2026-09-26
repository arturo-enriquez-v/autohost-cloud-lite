import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { removeClusterNodeBackend } from "@/lib/features/clusters/fetch/cluster.server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id, nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await removeClusterNodeBackend(id, nodeId, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Failed to remove node" }, { status: res.status });
  }
  return new Response(null, { status: 204 });
}
