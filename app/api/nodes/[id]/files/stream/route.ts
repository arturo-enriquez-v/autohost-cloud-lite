import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export const dynamic = "force-dynamic";

// GET /api/nodes/[id]/files/stream?path=...
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
    const rangeHeader = req.headers.get("Range");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const res = await fetch(
      `${baseUrl}/v1/nodes/${nodeId}/files/stream?path=${encodeURIComponent(path)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
        signal: req.signal,
      }
    );

    if (!res.ok && res.status !== 206) {
      const err = await res.json().catch(() => ({ error: "Stream failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const respHeaders = new Headers();
    const contentType = res.headers.get("Content-Type");
    if (contentType) respHeaders.set("Content-Type", contentType);

    const contentRange = res.headers.get("Content-Range");
    if (contentRange) respHeaders.set("Content-Range", contentRange);

    const contentLength = res.headers.get("Content-Length");
    if (contentLength) respHeaders.set("Content-Length", contentLength);

    const acceptRanges = res.headers.get("Accept-Ranges") || "bytes";
    respHeaders.set("Accept-Ranges", acceptRanges);

    respHeaders.set("Cache-Control", "no-cache, no-transform");
    respHeaders.set("Content-Disposition", "inline");

    return new NextResponse(res.body, {
      status: res.status, // 206 Partial Content or 200 OK
      headers: respHeaders,
    });
  } catch (err) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stream failed" },
      { status: 500 }
    );
  }
}
