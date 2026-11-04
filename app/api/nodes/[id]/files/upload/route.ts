import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// POST /api/nodes/[id]/files/upload?path=...
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/";
  const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:8090";

  try {
    const formData = await req.formData();
    const res = await fetch(
      `${baseUrl}/v1/nodes/${nodeId}/files/upload?path=${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        signal: AbortSignal.timeout(600_000),
      }
    );

    const data = await res.json().catch(() => ({ error: "Upload failed" }));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

