import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// GET /api/cloudflare-tunnel -> GET /v1/cloudflare-tunnel/status
export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await backendFetch(
      "/v1/cloudflare-tunnel/status",
      { method: "GET" },
      accessToken
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
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

// POST /api/cloudflare-tunnel
export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body as {
      action:
        | "login"
        | "quick-tunnel"
        | "config"
        | "disconnect"
        | "upsert-route"
        | "delete-route";
      domain?: string;
      [key: string]: unknown;
    };

    let endpoint = "/v1/cloudflare-tunnel/status";
    let method = "POST";
    let requestBody: string | undefined = JSON.stringify(payload);

    switch (action) {
      case "login":
        endpoint = "/v1/cloudflare-tunnel/login";
        requestBody = undefined;
        break;
      case "quick-tunnel":
        endpoint = "/v1/cloudflare-tunnel/quick-tunnel";
        requestBody = undefined;
        break;
      case "config":
        endpoint = "/v1/cloudflare-tunnel/config";
        break;
      case "disconnect":
        endpoint = "/v1/cloudflare-tunnel/disconnect";
        requestBody = undefined;
        break;
      case "upsert-route":
        endpoint = "/v1/cloudflare-tunnel/routes";
        break;
      case "delete-route":
        endpoint = `/v1/cloudflare-tunnel/routes/${encodeURIComponent(
          String(payload.domain ?? "")
        )}`;
        method = "DELETE";
        requestBody = undefined;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const res = await backendFetch(
      endpoint,
      {
        method,
        headers: requestBody ? { "Content-Type": "application/json" } : undefined,
        body: requestBody,
      },
      accessToken
    );

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "Request failed");
      return NextResponse.json({ error: text.trim() }, { status: res.status });
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
