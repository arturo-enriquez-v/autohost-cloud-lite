import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

/**
 * Catch-all proxy for the users & permissions module:
 *   /api/users/...  →  /v1/users/...
 */
type Ctx = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, ctx: Ctx, method: string) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path = [] } = await ctx.params;
  const suffix = path.map(encodeURIComponent).join("/");
  const target = `/v1/users${suffix ? `/${suffix}` : ""}`;

  const init: RequestInit = { method };
  if (method === "POST" || method === "PUT") {
    init.body = await request.text();
  }

  const res = await backendFetch(target, init, accessToken);
  if (res.status === 204) return new NextResponse(null, { status: 204 });

  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text.trim() };
  }

  if (!res.ok) {
    const obj = (data ?? {}) as Record<string, unknown>;
    const msg = (obj.error as string) || (obj.message as string) || text.trim() || "Request failed";
    return NextResponse.json({ error: msg }, { status: res.status });
  }
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: Request, ctx: Ctx) {
  return proxy(request, ctx, "GET");
}
export async function POST(request: Request, ctx: Ctx) {
  return proxy(request, ctx, "POST");
}
export async function PUT(request: Request, ctx: Ctx) {
  return proxy(request, ctx, "PUT");
}
export async function DELETE(request: Request, ctx: Ctx) {
  return proxy(request, ctx, "DELETE");
}
