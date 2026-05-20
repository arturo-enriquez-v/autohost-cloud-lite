import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// POST /api/nodes/[id]/profile
// Body: { type: "cpu" | "heap", duration?: number }
// Blocks while the agent samples, then returns { session_id, proxy_path }.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type: string; duration?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type, duration = 0 } = body;
  if (type !== "cpu" && type !== "heap") {
    return NextResponse.json({ error: 'type must be "cpu" or "heap"' }, { status: 400 });
  }

  try {
    // This call blocks for up to duration + 15 s waiting for the agent.
    const res = await backendFetch(
      `/v1/nodes/${nodeId}/profile`,
      {
        method: "POST",
        body: JSON.stringify({ type, duration }),
        signal: req.signal,
      },
      accessToken
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Profile collection failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request cancelled" }, { status: 499 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/nodes/[id]/profile/download
// Returns the raw .pb.gz bytes of the last collected profile.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await backendFetch(
    `/v1/nodes/${nodeId}/profile/download`,
    { cache: "no-store" },
    accessToken
  );

  if (!res.ok) {
    return new Response("Profile not found", { status: res.status });
  }

  const bytes = await res.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="pprof-${nodeId}.pb.gz"`,
    },
  });
}
