import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  return process.env.INTERNAL_API_URL ?? process.env.API_URL ?? "http://localhost:8080";
}

// GET /api/public-shares/[shareId]?mode=info|files&path=/...
export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "info";
  const path = searchParams.get("path") || "/";
  const shareToken = req.headers.get("X-Share-Token") || searchParams.get("st") || "";

  const baseUrl = getBaseUrl();
  const endpoint =
    mode === "files"
      ? `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/files?path=${encodeURIComponent(path)}`
      : `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/info`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: shareToken ? { "X-Share-Token": shareToken } : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "Failed to load share" }));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/public-shares/[shareId] (actions: "unlock" | "mkdir" | "delete")
export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const shareToken = req.headers.get("X-Share-Token") || "";
  const baseUrl = getBaseUrl();

  try {
    const body = await req.json();
    const { action, path, password } = body as {
      action: "unlock" | "mkdir" | "delete";
      path?: string;
      password?: string;
    };

    let endpoint = `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/unlock`;
    let method = "POST";
    let reqBody: string | undefined = JSON.stringify({ password });

    if (action === "mkdir") {
      endpoint = `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/mkdir`;
      reqBody = JSON.stringify({ path });
    } else if (action === "delete") {
      endpoint = `${baseUrl}/v1/public-shares/${encodeURIComponent(shareId)}/files?path=${encodeURIComponent(
        path || ""
      )}`;
      method = "DELETE";
      reqBody = undefined;
    }

    const headers: Record<string, string> = {};
    if (reqBody) headers["Content-Type"] = "application/json";
    if (shareToken) headers["X-Share-Token"] = shareToken;

    const res = await fetch(endpoint, {
      method,
      headers,
      body: reqBody,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
