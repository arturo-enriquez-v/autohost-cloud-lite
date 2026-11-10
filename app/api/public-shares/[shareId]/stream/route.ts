import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/public-shares/[shareId]/stream?path=...&st=...
export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const st = req.headers.get("X-Share-Token") || searchParams.get("st") || "";
  const baseUrl = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? "http://localhost:8080";

  try {
    const rangeHeader = req.headers.get("Range");
    const headers: Record<string, string> = {};
    if (st) headers["X-Share-Token"] = st;
    if (rangeHeader) headers["Range"] = rangeHeader;

    const res = await fetch(
      `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/stream?path=${encodeURIComponent(path)}&st=${encodeURIComponent(st)}`,
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
    respHeaders.set("Accept-Ranges", res.headers.get("Accept-Ranges") || "bytes");
    respHeaders.set("Cache-Control", "no-cache, no-transform");
    respHeaders.set("Content-Disposition", "inline");

    return new NextResponse(res.body, {
      status: res.status,
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
