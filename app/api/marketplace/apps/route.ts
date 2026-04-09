import { NextResponse } from "next/server";
import { getMarketplaceAppsBackend } from "@/lib/api/marketplace";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await getMarketplaceAppsBackend(accessToken);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
