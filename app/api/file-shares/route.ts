import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// GET /api/file-shares?node_id=...
export async function GET(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("node_id") || "";
  const qs = nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : "";

  try {
    const res = await backendFetch(
      `/v1/file-shares${qs}`,
      { method: "GET" },
      accessToken
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "Request failed");
      return NextResponse.json({ error: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/file-shares (create, update, or delete share link)
export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, share_id, ...payload } = body as {
      action?: "create" | "update" | "delete";
      share_id?: string;
      [key: string]: unknown;
    };

    let endpoint = "/v1/file-shares";
    let method = "POST";
    let reqBody: string | undefined = JSON.stringify(payload);

    if (action === "update" && share_id) {
      endpoint = `/v1/file-shares/${encodeURIComponent(share_id)}`;
      method = "PUT";
    } else if (action === "delete" && share_id) {
      endpoint = `/v1/file-shares/${encodeURIComponent(share_id)}`;
      method = "DELETE";
      reqBody = undefined;
    }

    const res = await backendFetch(
      endpoint,
      {
        method,
        headers: reqBody ? { "Content-Type": "application/json" } : undefined,
        body: reqBody,
      },
      accessToken
    );

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
