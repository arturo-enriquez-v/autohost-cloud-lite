import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { clearExternalLogsBackend, listExternalLogsBackend } from "@/lib/features/external_logs/fetch/external_logs.server";

export async function GET(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const offset = Number(searchParams.get("offset") ?? "0");
  const filter = {
    nodeId: searchParams.get("node_id") ?? undefined,
    level: searchParams.get("level") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  try {
    const res = await listExternalLogsBackend(accessToken, limit, offset, filter);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch logs" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await clearExternalLogsBackend(accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to clear logs" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
