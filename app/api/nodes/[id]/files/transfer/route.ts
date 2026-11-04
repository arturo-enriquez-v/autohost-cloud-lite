import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { backendFetch } from "@/lib/api";

// POST /api/nodes/[id]/files/transfer
export async function POST(
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
    const res = await backendFetch(
      `/v1/nodes/${nodeId}/files/transfer`,
      {
        method: "POST",
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(600_000),
      },
      accessToken
    );
    const data = await res.json().catch(() => ({ error: "Transfer failed" }));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transfer failed" },
      { status: 500 }
    );
  }
}

