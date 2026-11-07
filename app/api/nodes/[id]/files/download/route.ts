import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// GET /api/nodes/[id]/files/download?path=...
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:8090";

  try {
    const res = await fetch(
      `${baseUrl}/v1/nodes/${nodeId}/files/download?path=${encodeURIComponent(path)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: req.signal,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Download failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const headers = new Headers();
    const contentDisposition = res.headers.get("Content-Disposition");
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }
    headers.set(
      "Content-Type",
      res.headers.get("Content-Type") || "application/octet-stream"
    );
    const contentLength = res.headers.get("Content-Length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", "no-cache, no-transform");

    return new NextResponse(res.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Download failed" },
      { status: 500 }
    );
  }
}

