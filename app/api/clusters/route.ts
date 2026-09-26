import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { createClusterBackend, getClustersBackend } from "@/lib/features/clusters/fetch/cluster.server";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getClustersBackend(accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Failed to fetch clusters" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data ?? [], { status: 200 });
}

export async function POST(request: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.manager_node_id) {
    return NextResponse.json({ error: "name and manager_node_id are required" }, { status: 400 });
  }

  const res = await createClusterBackend(body, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Failed to create cluster" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
