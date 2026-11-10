import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// GET /api/tailscale-funnel -> GET /v1/tailscale-funnel/status
export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await backendFetch(
      "/v1/tailscale-funnel/status",
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

// POST /api/tailscale-funnel
export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, route_id, ...payload } = body as {
      action: "config" | "upsert-route" | "delete-route";
      route_id?: string;
      [key: string]: unknown;
    };

    let endpoint = "/v1/tailscale-funnel/status";
    let method = "POST";
    let reqBody: string | undefined = JSON.stringify(payload);

    switch (action) {
      case "config":
        endpoint = "/v1/tailscale-funnel/config";
        break;
      case "upsert-route":
        endpoint = "/v1/tailscale-funnel/routes";
        break;
      case "delete-route":
        endpoint = `/v1/tailscale-funnel/routes/${encodeURIComponent(
          String(route_id ?? "")
        )}`;
        method = "DELETE";
        reqBody = undefined;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
