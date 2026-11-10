import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/public-shares/[shareId]/upload?path=...
export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  if (!req.body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/";
  const st = req.headers.get("X-Share-Token") || searchParams.get("st") || "";
  const baseUrl = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? "http://localhost:8080";

  try {
    const contentType = req.headers.get("content-type");
    const contentLength = req.headers.get("content-length");

    const headers: Record<string, string> = {};
    if (st) headers["X-Share-Token"] = st;
    if (contentType) headers["content-type"] = contentType;
    if (contentLength) headers["content-length"] = contentLength;

    const res = await fetch(
      `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/upload?path=${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers,
        body: req.body,
        // @ts-expect-error duplex is required for streaming request body in Node fetch
        duplex: "half",
        signal: AbortSignal.timeout(3_600_000),
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
