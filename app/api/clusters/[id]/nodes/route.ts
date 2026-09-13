import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { addClusterNodeBackend } from "@/lib/features/clusters/fetch/cluster.server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.node_id) {
    return NextResponse.json({ error: "node_id is required" }, { status: 400 });
  }

  const res = await addClusterNodeBackend(id, body, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Failed to add node" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
