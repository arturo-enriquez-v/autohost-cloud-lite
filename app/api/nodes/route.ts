import { NextResponse } from "next/server";
import { getNodesBackend, mapNodeFromBackend, updateNodeBackend } from "@/lib/features/nodes/nodes/fetch/nodes.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { NodeBackendResponse } from "@/lib/types";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const res = await getNodesBackend(accessToken);
  const data = await res.json().catch(() => ([]));

  const mapped = Array.isArray(data)
    ? (data as NodeBackendResponse[]).map(mapNodeFromBackend)
    : data;

  return NextResponse.json(mapped, { status: res.status });
}

export async function PUT(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, hostname } = await req.json();
    if (!id || !hostname) {
      return NextResponse.json({ error: "Missing id or hostname" }, { status: 400 });
    }

    const res = await updateNodeBackend(id, hostname, accessToken);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
