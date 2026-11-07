import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export const dynamic = "force-dynamic";

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

  if (!req.body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/";
  const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:8090";

  try {
    const contentType = req.headers.get("content-type");
    const contentLength = req.headers.get("content-length");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (contentType) {
      headers["content-type"] = contentType;
    }
    if (contentLength) {
      headers["content-length"] = contentLength;
    }

    const res = await fetch(
      `${baseUrl}/v1/nodes/${nodeId}/files/upload?path=${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers,
        body: req.body,
        // @ts-expect-error duplex is required for streaming request body in Node fetch
        duplex: "half",
        signal: AbortSignal.timeout(3_600_000), // 1 hour for huge transfers
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


