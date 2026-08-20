import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { listDiagnosticsBackend } from "@/lib/features/diagnostics/fetch/diagnostics.server";

export async function GET(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("node_id") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;

  try {
    const res = await listDiagnosticsBackend(accessToken, { node_id: nodeId, status, limit, offset });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to list diagnostics" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[API] list diagnostics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
