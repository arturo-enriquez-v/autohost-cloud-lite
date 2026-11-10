import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/public-shares/[shareId]/download?path=...&st=...
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
    const res = await fetch(
      `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/download?path=${encodeURIComponent(path)}&st=${encodeURIComponent(st)}`,
      {
        method: "GET",
        headers: st ? { "X-Share-Token": st } : undefined,
        cache: "no-store",
        signal: req.signal,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Download failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const respHeaders = new Headers();
    const contentType = res.headers.get("Content-Type");
    if (contentType) respHeaders.set("Content-Type", contentType);
    const contentDisposition = res.headers.get("Content-Disposition");
    if (contentDisposition) respHeaders.set("Content-Disposition", contentDisposition);
    const contentLength = res.headers.get("Content-Length");
    if (contentLength) respHeaders.set("Content-Length", contentLength);

    return new NextResponse(res.body, {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Download failed" },
      { status: 500 }
    );
  }
}
