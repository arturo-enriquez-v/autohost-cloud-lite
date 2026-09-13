import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { deleteClusterServiceBackend } from "@/lib/features/clusters/fetch/cluster.server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await deleteClusterServiceBackend(id, serviceId, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Failed to delete service" }, { status: res.status });
  }
  return new Response(null, { status: 204 });
}
