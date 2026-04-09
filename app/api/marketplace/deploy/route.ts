import { NextRequest, NextResponse } from "next/server";
import { deployMarketplaceAppBackend } from "@/lib/api/marketplace";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { node_id?: string; app_name?: string; env_vars?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.node_id || !body.app_name) {
    return NextResponse.json({ error: "node_id and app_name are required" }, { status: 400 });
  }

  const res = await deployMarketplaceAppBackend(
    body.node_id,
    body.app_name,
    body.env_vars ?? {},
    accessToken
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
